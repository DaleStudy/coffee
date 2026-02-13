const ENCODER = new TextEncoder();

export async function verifyRequest(
	body: string,
	signature: string,
	timestamp: string,
	publicKey: string,
): Promise<boolean> {
	const key = await crypto.subtle.importKey(
		"raw",
		hexToUint8Array(publicKey),
		{ name: "Ed25519", namedCurve: "Ed25519" },
		false,
		["verify"],
	);

	return crypto.subtle.verify(
		"Ed25519",
		key,
		hexToUint8Array(signature),
		ENCODER.encode(timestamp + body),
	);
}

function hexToUint8Array(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}
