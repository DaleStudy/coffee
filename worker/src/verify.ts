const ENCODER = new TextEncoder();

export async function verifyRequest(
	body: string,
	signature: string,
	timestamp: string,
	publicKey: string,
): Promise<boolean> {
	try {
		const key = await crypto.subtle.importKey(
			"raw",
			hexToUint8Array(publicKey),
			"Ed25519",
			false,
			["verify"],
		);

		return await crypto.subtle.verify(
			"Ed25519",
			key,
			hexToUint8Array(signature),
			ENCODER.encode(timestamp + body),
		);
	} catch {
		return false;
	}
}

function hexToUint8Array(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}
