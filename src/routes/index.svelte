<script>
	import { db } from "../firebase";
	import { collection, doc } from "firebase/firestore";

	let callId = null;
	let person = "callee";

	function startCall() {
		if (!callId) {
			const callDoc = doc(collection(db, "calls"));
			callId = callDoc.id;
			person = "caller";
		}

		location.href = `./${callId}-${person}`;
	}
</script>

<main class="h-screen grid place-content-center gap-8 justify-items-center">
	<div
		class="bg-white px-8 pb-8 pt-5 rounded-md border-2 border-gray-500 grid justify-items-center gap-5"
	>
		<div class="flex items-center gap-2">
			<img src="video.png" alt="video icon" class="h-16" />
			<h1>EZ Meet</h1>
		</div>

		<div class="space-x-4">
			<button
				on:click={startCall}
				class="bg-sky-500 hover:bg-sky-600 px-3.5 py-0.5 rounded-md text-white"
				>Start</button
			>
			<button
				on:click={startCall}
				class="bg-gray-400 hover:bg-gray-500 disabled:bg-gray-200 disabled:text-gray-500 px-3.5 py-0.5 rounded-md"
				disabled={!callId}>Join</button
			>
		</div>

		<input
			bind:value={callId}
			class="px-3.5 py-0.5 w-56 text-center rounded-md border-2 border-gray-500"
			type="text"
			placeholder="Enter code"
		/>
	</div>

	<div class="bg-white p-4 rounded-md border-2 border-gray-500 w-4/5 sm:w-96">
		<h3 class="font-semibold text-center">ATTENTION</h3>
		<ul class="list-disc list-inside">
			<li class="text-xl text-justify">
				For the most optimal experience, open this app on a
				laptop/desktop.
			</li>
			<li class="text-xl text-justify">
				Make sure to be ready before entering a room, as the webcam and
				microphone are automatically enabled.
			</li>
		</ul>
	</div>
</main>
