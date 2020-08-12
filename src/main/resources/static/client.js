//connecting to our signaling server 
var conn = new WebSocket('wss://192.168.0.22:8080/socket');

conn.onopen = function() {
	console.log("Connected to the signaling server");
	initialize();
};

conn.onmessage = function(msg) {
	console.log("Got message", msg.data);
	var content = JSON.parse(msg.data);
	var data = content.data;
	switch (content.event) {
	// when somebody wants to call us
	case "offer":
		handleOffer(data);
		break;
	case "answer":
		handleAnswer(data);
		break;
		// when a remote peer sends an ice candidate to us
	case "candidate":
		handleCandidate(data);
		break;
	default:
		break;
	}
};

function send(message) {
	conn.send(JSON.stringify(message));
}

var peerConnection = null;
var dataChannel = null;
var input = document.getElementById("messageInput");
var psdo = null;

function createPseudo() {
	psdo = document.getElementById('pseudoInput').value;
	var p = document.createElement("p");
	p.innerHTML = psdo;
}
	

function initialize() {
	var configuration = {
			"iceServers" : [ {
				"url" : "stun:stun2.1.google.com:19302"
			} ]
	};

	peerConnection = new RTCPeerConnection(configuration, {
		optional : [ {
			RtpDataChannels : true
		} ]
	});

	// Setup ice handling
	peerConnection.onicecandidate = function(event) {
		if (event.candidate) {
			send({
				event : "candidate",
				data : event.candidate
			});
		}
	};

	// Creating data channel
	dataChannel = peerConnection.createDataChannel("dataChannel", {
		reliable : true
	});

	dataChannel.onerror = function(error) {
		console.log("Error occured on datachannel:", error);
	};

	// When we receive a message from the other peer, printing on a li tag
	dataChannel.onmessage = function(event) {
		var message = event.data;
		var li = document.createElement("li");
		li.innerHTML = psdo + " : " + message;
		document.getElementById("textMessages").appendChild(li);

	};

	dataChannel.onclose = function() {
		console.log("data channel is closed");
	};
}

function createOffer() {
	peerConnection.createOffer(function(offer) {
		send({
			event : "offer",
			data : offer
		});
		peerConnection.setLocalDescription(offer);
	}, function(error) {
		console.error("An error has occured : " + error);
	});
}

function handleOffer(offer) {
	peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	// Create and send an answer to an offer
	peerConnection.createAnswer(function(answer) {
		peerConnection.setLocalDescription(answer);
		send({
			event : "answer",
			data : answer
		});
	}, function(error) {
		console.error("An error has occured : " + error);
	});

};

function handleCandidate(candidate) {
	peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function handleAnswer(answer) {
	peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
	console.log("connection established successfully!!");
};

function sendMessage() {
	dataChannel.send(input.value);
	input.value = "";
}


const constraints = {
		video: true,
		audio : true
};
navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream) {
	document.getElementById('localVideo').srcObject = stream;
	peerConnection.addStream(stream);
	peerConnection.onaddstream = function(event) {
		document.getElementById('remoteVideo').srcObject = event.stream;
	};
})
.catch(function(err) {
	console.error('An error has occured : ' + err);
});