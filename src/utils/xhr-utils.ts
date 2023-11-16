export async function loadSound(context: BaseAudioContext, url: string): Promise<AudioBuffer> {
	return new Promise((res, rej) => {
		const request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		request.onload = function () {
			// Asynchronously decode the audio file data
			context.decodeAudioData(
				request.response,
				function (buffer) {
					if (!buffer) {
						console.log('error decoding file data:', url);
						return;
					}

					res( buffer );
				}
			);
		}

		request.onerror = e => rej(e);
		request.send();
	});
}