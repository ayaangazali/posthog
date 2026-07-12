//! Per-message scrub context: the allow lists plus a blur memo.
//!
//! Within one Kafka message the same image often recurs thousands of times (a canvas redrawing one
//! sprite, a repeated background). Blurring is pure in its input, so we memoize it per message and
//! collapse that fan-out to a single decode+blur — mirroring the TS `blurCache` (also scoped to one
//! message). Scope is one `anonymize_message` call; the map is dropped when it returns.

use std::cell::{Cell, RefCell};
use std::collections::HashMap;

use anyhow::{bail, Result};

use crate::allow_lists::AllowLists;
use crate::blur::{blur_image_data_uri, pixelate_raw_rgba};
use crate::collect::{collectable_data_uri_bytes, CollectedImage, ImageCollection, ImageCollector};

/// Cumulative decompressed-bytes budget across all cv payloads in one message: the per-payload
/// `gzip::MAX_DECOMPRESSED_BYTES` cap bounds each field, this bounds their sum so many high-ratio
/// fields can't decompress gigabytes serially. Real messages total under 10 MB.
const CV_MESSAGE_DECOMPRESSION_BUDGET: usize = 256 * 1024 * 1024;

pub struct Ctx<'a> {
    pub allow: &'a AllowLists,
    /// Registrable-domain patterns (computed TS-side from the team's recording domains);
    /// matching hosts and their subdomains collapse to example.com in the URL scrub.
    pub first_party_hosts: Vec<String>,
    pub cv_budget: Cell<usize>,
    // key: the original data URI (data-image blur), or `raw:{w}x{h}:{base64}` (raw RGBA pixelate).
    // value: the replacement — a content ref (collection lane), a blurred data URI — or `None`
    // when neither could be produced (caller falls back to a blank pixel).
    blur_cache: RefCell<HashMap<String, Option<String>>>,
    // `Some` routes collectable images to the scrub lane instead of the inline blur.
    images: Option<RefCell<ImageCollector>>,
}

impl<'a> Ctx<'a> {
    pub fn new(allow: &'a AllowLists) -> Self {
        Self::with_first_party_hosts(allow, Vec::new())
    }

    pub fn with_first_party_hosts(allow: &'a AllowLists, first_party_hosts: Vec<String>) -> Self {
        Self::with_image_collection(allow, first_party_hosts, None)
    }

    pub fn with_image_collection(
        allow: &'a AllowLists,
        first_party_hosts: Vec<String>,
        image_collection: Option<ImageCollection>,
    ) -> Self {
        Self {
            allow,
            first_party_hosts,
            cv_budget: Cell::new(CV_MESSAGE_DECOMPRESSION_BUDGET),
            blur_cache: RefCell::new(HashMap::new()),
            images: image_collection.map(|c| RefCell::new(ImageCollector::new(c))),
        }
    }

    /// Drain the collected images (hash-sorted). Empty when collection was off.
    pub fn into_collected_images(self) -> Vec<CollectedImage> {
        match self.images {
            Some(collector) => collector.into_inner().into_images(),
            None => Vec::new(),
        }
    }

    /// The only budgeted cv decompression path — cv code must not call `gzip::gunzip` directly.
    pub fn gunzip_cv(&self, raw: &[u8]) -> Result<Vec<u8>> {
        let out = crate::gzip::gunzip(raw)?;
        match self.cv_budget.get().checked_sub(out.len()) {
            Some(rest) => self.cv_budget.set(rest),
            None => bail!("message exceeds the cumulative cv decompression budget"),
        }
        Ok(out)
    }

    // Borrow discipline: never hold a `blur_cache` borrow across the blur call — the compute runs
    // borrow-free, so a future blur helper that re-entered `Ctx` still couldn't double-borrow-panic.

    /// Replace a data-image URI, memoized on the URI: a content ref when the collection lane takes
    /// it (the original bytes ride back to the caller for the out-of-band scrub), else the inline
    /// blur. `None` → caller falls back to a blank/placeholder.
    pub fn blur_data_uri(&self, original: &str) -> Option<String> {
        if let Some(hit) = self.blur_cache.borrow().get(original) {
            return hit.clone();
        }
        let result = self
            .collect_image(original)
            .or_else(|| blur_image_data_uri(original));
        self.blur_cache
            .borrow_mut()
            .insert(original.to_string(), result.clone());
        result
    }

    /// The collection lane's ref for a data URI, or `None` (collection off, non-collectable URI,
    /// or a cap hit) — the caller then blurs inline as before.
    fn collect_image(&self, original: &str) -> Option<String> {
        let collector = self.images.as_ref()?;
        let bytes = collectable_data_uri_bytes(original)?;
        collector.borrow_mut().collect(bytes)
    }

    /// Pixelate raw RGBA pixels, memoized on dimensions + bytes.
    pub fn pixelate_raw(&self, rgba_base64: &str, width: u32, height: u32) -> Option<String> {
        let key = format!("raw:{width}x{height}:{rgba_base64}");
        if let Some(hit) = self.blur_cache.borrow().get(&key) {
            return hit.clone();
        }
        let result = pixelate_raw_rgba(rgba_base64, width, height);
        self.blur_cache.borrow_mut().insert(key, result.clone());
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testkit::png_data_uri;

    #[test]
    fn blur_memo_is_stable_and_keyed_per_image() {
        let allow = AllowLists::new(Vec::<String>::new(), Vec::<String>::new());
        let ctx = Ctx::new(&allow);
        let a = png_data_uri(100, 50, [10, 20, 30, 255]);
        let b = png_data_uri(40, 40, [200, 100, 50, 255]);
        // Same input → same result twice (a cache hit must not return something different).
        assert_eq!(ctx.blur_data_uri(&a), ctx.blur_data_uri(&a));
        // Distinct inputs → distinct results (guards against a cache-key collision serving A's blur for B).
        assert_ne!(ctx.blur_data_uri(&a), ctx.blur_data_uri(&b));
    }
}
