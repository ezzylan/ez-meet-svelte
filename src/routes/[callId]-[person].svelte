<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { db } from '../firebase';
	import {
		collection,
		doc,
		addDoc,
		setDoc,
		onSnapshot,
		getDoc,
		updateDoc,
		deleteDoc
	} from 'firebase/firestore';

	let width = null;
	let peerConnection = null;
	let localStream = null;
	let remoteStream = null;
	let webcamVideo = null;
	let remoteVideo = null;
	const callId = $page.params.callId;
	const person = $page.params.person;

	const servers = {
		iceServers: [
			{
				urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
			}
		],
		iceCandidatePoolSize: 10
	};

	async function setupMediaSources() {
		peerConnection = new RTCPeerConnection(servers);

		webcamVideo = document.getElementById('webcamVideo');
		remoteVideo = document.getElementById('remoteVideo');

		localStream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		});
		remoteStream = new MediaStream();

		// Push tracks from local stream to peer connection
		localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

		// Pull tracks from remote stream, add to video stream
		peerConnection.ontrack = (event) => {
			event.streams[0].getTracks().forEach((track) => {
				remoteStream.addTrack(track);
			});
		};

		webcamVideo.srcObject = localStream;
		remoteVideo.srcObject = remoteStream;
	}

	async function connectToRTC(person) {
		// Reference Firestore collections for signaling
		const callDoc = doc(db, 'calls', callId);
		const offerCandidates = collection(callDoc, 'offerCandidates');
		const answerCandidates = collection(callDoc, 'answerCandidates');

		if (person === 'caller') {
			// Get candidates for caller, save to db
			peerConnection.onicecandidate = (event) => {
				event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
			};

			// Create offer
			const offerDescription = await peerConnection.createOffer();
			await peerConnection.setLocalDescription(offerDescription);

			const offer = {
				sdp: offerDescription.sdp,
				type: offerDescription.type
			};

			await setDoc(callDoc, { offer });

			// Listen for remote answer
			onSnapshot(callDoc, (snapshot) => {
				const data = snapshot.data();
				if (!peerConnection.currentRemoteDescription && data?.answer) {
					const answerDescription = new RTCSessionDescription(data.answer);
					peerConnection.setRemoteDescription(answerDescription);
				}
			});

			// When answered, add candidate to peer connection
			onSnapshot(answerCandidates, (snapshot) => {
				snapshot.docChanges().forEach((change) => {
					if (change.type === 'added') {
						const candidate = new RTCIceCandidate(change.doc.data());
						peerConnection.addIceCandidate(candidate);
					}
				});
			});
		} else {
			peerConnection.onicecandidate = (event) => {
				event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
			};

			const callData = (await getDoc(callDoc)).data();

			const offerDescription = callData.offer;
			await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

			const answerDescription = await peerConnection.createAnswer();
			await peerConnection.setLocalDescription(answerDescription);

			const answer = {
				type: answerDescription.type,
				sdp: answerDescription.sdp
			};

			await updateDoc(callDoc, { answer });

			onSnapshot(offerCandidates, (snapshot) => {
				snapshot.docChanges().forEach((change) => {
					if (change.type === 'added') {
						let data = change.doc.data();
						peerConnection.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
		}
	}

	// async function toggleWebcam() {
	// webcamVideo = document.getElementById('webcamVideo');
	// localStream = await navigator.mediaDevices.getUserMedia({
	// 	video: false,
	// 	audio: true
	// });
	// webcamVideo.srcObject = localStream;
	// }

	// async function toggleMic() {
	// 	localStream = await navigator.mediaDevices.getUserMedia({
	// 		video: true,
	// 		audio: false
	// 	});

	// 	const webcamVideo = document.getElementById('webcamVideo');
	// 	webcamVideo.srcObject = localStream;
	// }

	async function hangUpCall() {
		const tracks = webcamVideo.srcObject.getTracks();
		tracks.forEach((track) => track.stop());

		if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
		if (peerConnection) peerConnection.close();

		// Delete room on hangup
		if (callId) {
			const callDoc = doc(db, 'calls', callId);
			await deleteDoc(callDoc);
		}

		location.href = '/';
	}

	const toggleIdPopup = () => {
		const idPopup = document.getElementById('idPopup');
		const main = document.getElementById('main');

		idPopup.classList.toggle('invisible');
		main.classList.toggle('invisible');
		// main.classList.toggle('blur-sm');
	};

	onMount(() => {
		width = screen.width;
		setupMediaSources();
		setTimeout(() => connectToRTC(person), 1000);
	});
</script>

<section id="idPopup" class="absolute h-screen grid place-content-center inset-x-1/2 invisible">
	<div class="flex flex-col items-center gap-8">
		<div class="bg-white p-4 rounded-xl text-left border-2 border-gray-500">
			<p class="text-2xl font-semibold text-center">Code generated:</p>
			<p class="text-xl italic">{callId}</p>
		</div>

		<div on:click={toggleIdPopup} class="bg-red-600 p-2 w-16 rounded-xl">
			<img src="/static/cross-sign.png" alt="close icon" />
		</div>
	</div>
</section>

<main id="main" class="bg-gray-900 h-screen p-8 gap-8 grid grid-cols-6 grid-rows-1">
	<section class="col-span-full flex flex-col lg:flex-row gap-8">
		<div class="bg-gray-500 basis-1/2 grid place-content-center h-1/2 lg:h-full">
			<!-- svelte-ignore a11y-media-has-caption -->
			<video id="webcamVideo" class="h-full" autoplay />
		</div>
		<div class="bg-gray-500 basis-1/2 grid place-content-center h-1/2 lg:h-full">
			<!-- svelte-ignore a11y-media-has-caption -->
			<video id="remoteVideo" class="h-full" autoplay />
		</div>
	</section>

	<section class="col-span-full flex flex-row justify-center items-center gap-8">
		{#if width < 640}
			<div class="bg-white p-2 rounded-xl text-center" on:click={toggleIdPopup}>
				<img src="/static/id.png" alt="id icon" />
			</div>
		{:else}
			<div class="bg-white p-4 rounded-xl text-left">
				<p class="text-2xl font-semibold">Code generated:</p>
				<p class="text-xl italic">{callId}</p>
			</div>
		{/if}

		<!-- <div class="bg-gray-500 w-52 h-20 rounded-full p-4 flex gap-4"> -->
		<div class="bg-gray-500 w-44 rounded-full p-3 gap-4">
			<!-- <img
				on:click={toggleMic}
				class="bg-gray-900 hover:bg-gray-700 rounded-full p-3"
				src="/static/microphone-black-shape.png" alt="mic icon"
			/> -->
			<!-- <img
				on:click={hangUpCall}
				class="bg-red-600 hover:bg-red-700 rounded-full p-3"
				src="/static/hang-up.png" alt="hang up icon"
			/> -->
			<!-- <img
				on:click={toggleWebcam}
				class="bg-gray-900 hover:bg-gray-700 rounded-full p-3"
				src="/static/video-camera.png" alt="webcam icon"
			/> -->
			<div
				class="bg-red-600 hover:bg-red-700 rounded-full p-3 flex justify-around items-center"
				on:click={hangUpCall}
			>
				<img class="w-8" src="static/hang-up.png" alt="hang up icon" />
				<p class="text-white text-lg font-semibold">End Call</p>
			</div>
		</div>
	</section>
</main>
