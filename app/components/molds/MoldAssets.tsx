import { FillingMold, type FillingMoldProps } from "./FillingMold";

type AssetProps = Omit<
  FillingMoldProps,
  "name" | "description" | "outlineSrc" | "maskSrc" | "aspectRatio"
>;

export function HouseMold(props: AssetProps) {
  return (
    <FillingMold
      name="House"
      description="A broad, low mold with a gently sloping roof."
      outlineSrc="/molds/outlines/house.svg"
      maskSrc="/molds/masks/house.png"
      aspectRatio="758 / 559"
      {...props}
    />
  );
}

export function BucketMold(props: AssetProps) {
  return (
    <FillingMold
      name="Bucket"
      description="The classic pail, including its arched handle."
      outlineSrc="/molds/outlines/bucket.svg"
      maskSrc="/molds/masks/bucket.png"
      aspectRatio="590 / 559"
      {...props}
    />
  );
}

export function ConeMold(props: AssetProps) {
  return (
    <FillingMold
      name="Cone"
      description="A compact spire with a scalloped base."
      outlineSrc="/molds/outlines/cone.svg"
      maskSrc="/molds/masks/cone.png"
      aspectRatio="482 / 559"
      {...props}
    />
  );
}

export function TowerMold(props: AssetProps) {
  return (
    <FillingMold
      name="Tower"
      description="A tall turret with a crenellated crown."
      outlineSrc="/molds/outlines/tower.svg"
      maskSrc="/molds/masks/tower.png"
      aspectRatio="394 / 513"
      {...props}
    />
  );
}

export function CastleMold(props: AssetProps) {
  return (
    <FillingMold
      name="Castle"
      description="A full keep with an open central arch."
      outlineSrc="/molds/outlines/castle.svg"
      maskSrc="/molds/masks/castle.png"
      aspectRatio="645 / 592"
      {...props}
    />
  );
}
