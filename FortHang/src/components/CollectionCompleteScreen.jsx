const COMPLETE_IMAGE = `${import.meta.env.BASE_URL}collection-complete.png`;

export default function CollectionCompleteScreen({ onOpenCatalogue }) {
  return (
    <section className="collection-complete-screen" aria-labelledby="collection-complete-heading">
      <img
        src={COMPLETE_IMAGE}
        alt=""
        className="collection-complete-image"
      />
      <h2 id="collection-complete-heading" className="collection-complete-sr-only">
        Wow! You collected them all! Congratulations, Peely is proud!
      </h2>
      <button type="button" className="secondary-button" onClick={onOpenCatalogue}>
        Skin Catalogue
      </button>
    </section>
  );
}
