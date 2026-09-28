declare module "subset-font" {
  type TargetFormat = "woff2" | "woff" | "sfnt";

  export default function subsetFont(
    font: Buffer,
    text: string,
    options: { targetFormat: TargetFormat; noHinting?: boolean },
  ): Promise<Buffer>;
}
