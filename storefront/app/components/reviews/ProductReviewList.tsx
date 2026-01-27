import { LightboxGallery } from '@app/components/common/images/LightboxGallery';
import { StoreProductReview } from '@lambdacurry/medusa-plugins-sdk';
import { formatDate } from '@libs/util';
import { type FC, useState } from 'react';
import { ReviewImageThumbnailRow } from './ReviewImageThumbnailRow';
import { StarRating } from './StarRating';

export interface ProductReviewListProps {
  productReviews?: StoreProductReview[];
  className?: string;
}

export const ProductReviewList: FC<ProductReviewListProps> = ({ productReviews }) => {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [currentGalleryImages, setCurrentGalleryImages] = useState<{ url: string; alt?: string; name?: string }[]>([]);

  // Function to handle image click from any review
  const handleImageClick = (reviewImages: { url: string; alt?: string; name?: string }[], imageIndex: number) => {
    setCurrentGalleryImages(reviewImages);
    setLightboxIndex(imageIndex);
  };

  return (
    <div>
      {productReviews && productReviews.length > 0 && (
        <div className="-my-12 divide-y divide-primary-200/15">
          {productReviews.map((review, reviewIndex) => {
            const galleryImages = (review.images || []).map((image) => ({
              url: image.url,
              alt: "Customer's review image",
              name: "Customer's review image",
            }));

            return (
              <div key={review.id} className="py-8">
                <div className=" flex items-center justify-between">
                  <h3 className="mr-2 text-sm font-bold text-primary-50">{review.name ?? 'Anonymous'}</h3>
                  <div className="mt-1 flex items-center pb-1">
                    <StarRating value={review.rating ?? 0} readOnly />
                  </div>
                  <p className="sr-only">{review.rating} out of 5 stars</p>
                </div>
                <time className="text-xs italic text-primary-200" dateTime={review.created_at}>
                  {formatDate(new Date(review.created_at))}
                </time>

                <div
                  className="mt-4 space-y-6 text-base italic text-primary-200"
                  dangerouslySetInnerHTML={{ __html: review.content }}
                />

                {galleryImages.length > 0 && (
                  <ReviewImageThumbnailRow
                    galleryImages={galleryImages}
                    onClick={(imageIndex) => handleImageClick(galleryImages, imageIndex)}
                  />
                )}

                {/* Store Owner Response */}
                {review.response && review.response.content && (
                  <div className="mt-4 rounded-md bg-highlight-100/60 p-4 border border-primary-200/20">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-primary-50">Our Response</h4>
                      {review.response.created_at && (
                        <time
                          className="ml-2 text-xs italic text-primary-200/80"
                          dateTime={String(review.response.created_at)}
                        >
                          {formatDate(new Date(review.response.created_at))}
                        </time>
                      )}
                    </div>
                    <div
                      className="mt-2 text-sm text-primary-200"
                      dangerouslySetInnerHTML={{ __html: review.response.content }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Single LightboxGallery for all reviews */}
      <LightboxGallery
        images={currentGalleryImages.map(({ url, ...image }) => ({ ...image, src: url }))}
        lightBoxIndex={lightboxIndex}
        setLightBoxIndex={setLightboxIndex}
      />
    </div>
  );
};
