const COMPLETE_IMAGE = `${import.meta.env.BASE_URL}collection-complete.png`;

export default function CollectionCompleteScreen({
  onOpenCatalogue,
  onOpenSidekicks,
  onOpenShop,
  onOpenFortSort,
  onOpenHelp,
}) {
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
      {onOpenSidekicks ? (
        <button type="button" className="secondary-button" onClick={onOpenSidekicks}>
          Sidekick Catalogue
        </button>
      ) : null}
      {onOpenShop ? (
        <button type="button" className="secondary-button" onClick={onOpenShop}>
          Shop
        </button>
      ) : null}
      {onOpenFortSort ? (
        <button type="button" className="secondary-button" onClick={onOpenFortSort}>
          FortSort
        </button>
      ) : null}
      {onOpenHelp ? (
        <button type="button" className="secondary-button" onClick={onOpenHelp}>
          Help
        </button>
      ) : null}
    </section>
  );
}
