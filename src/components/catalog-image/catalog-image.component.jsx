import { useState } from "react";

import "./catalog-image.styles.scss";

const CatalogImage = ({ photo, alt, className, sizes, loading = "lazy", onUnavailable }) => {
  const [failedSources, setFailedSources] = useState([]);
  const showOriginal = failedSources.includes(photo.src);
  const src = showOriginal ? photo.fallback : photo.src;

  if (!src || failedSources.includes(src)) {
    return (
      <div className={`catalog-image-placeholder ${className ?? ""}`} aria-hidden={!alt}>
        Image unavailable
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      srcSet={showOriginal || !sizes ? undefined : photo.srcSet}
      sizes={showOriginal || !photo.srcSet ? undefined : sizes}
      width={showOriginal ? undefined : photo.width}
      height={showOriginal ? undefined : photo.height}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => {
        setFailedSources((failed) => [...failed, src]);
        if (showOriginal || !photo.fallback) onUnavailable?.();
      }}
    />
  );
};

export default CatalogImage;
