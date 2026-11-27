export default function AchievementPopup({ achievement, onClose }) {
  if (!achievement) return null;
  return (
    <div className="achievement-popup-backdrop" role="presentation">
      <div className="achievement-popup" role="dialog" aria-modal="true" aria-labelledby="achievement-popup-title">
        <p id="achievement-popup-title" className="achievement-popup-title">
          {achievement.headline}
        </p>
        {achievement.icon ? (
          <img className="achievement-popup-image" src={achievement.icon} alt="" />
        ) : null}
        <button type="button" className="primary-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
