import {
  BucketMold,
  CastleMold,
  ConeMold,
  HouseMold,
  TowerMold,
} from "./components/molds/MoldAssets";

export default function Home() {
  return (
    <main className="molds-page">
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />

      <header className="page-intro">
        <div>
          <p className="page-intro__kicker">Tideline / mold studies</p>
          <h1>
            Fill the mold.
            <br />
            <em>Shape the shore.</em>
          </h1>
        </div>
        <div className="page-intro__copy">
          <p>
            Press and hold any mold to scoop sand into it. Each asset keeps its
            own progress and can be reset independently.
          </p>
          <span>Five interactive studies · one reusable fill system</span>
        </div>
      </header>

      <section className="mold-grid" aria-label="Interactive sand molds">
        <HouseMold fillColor="#f0c77a" fillDurationMs={2800} />
        <BucketMold fillColor="#f3b96a" fillDurationMs={2500} />
        <ConeMold fillColor="#ffd98a" fillDurationMs={1900} />
        <TowerMold fillColor="#e8c896" fillDurationMs={2300} />
        <CastleMold fillColor="#dcb87e" fillDurationMs={3100} />
      </section>

      <footer className="page-footer">
        <span>Built for sand, shaped by play.</span>
        <span>Hold · fill · release</span>
      </footer>
    </main>
  );
}
