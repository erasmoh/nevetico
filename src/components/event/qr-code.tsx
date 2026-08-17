import QRCode from "qrcode";

export async function QrCode({
  value,
  alt = "QR",
  width = 220,
}: {
  value: string;
  alt?: string;
  width?: number;
}) {
  const dataUrl = await QRCode.toDataURL(value, { margin: 1, width });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={alt}
      width={width}
      height={width}
      className="rounded-lg border border-border bg-white p-2"
    />
  );
}
