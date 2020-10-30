import './main.css';

import * as sdpTransform from 'sdp-transform';

import {ENCODINGS, FTMP, RTCP_FB, RTP} from './rtc_consts.js';

const canvas = document.querySelector('canvas');

const ctx = canvas.getContext('2d');

const remote = document.getElementById('remote');
const source = document.getElementById('source');

source.addEventListener('loadedmetadata', function () {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

source.addEventListener(
  'play',
  function () {
    const cw = this.clientWidth;
    const ch = this.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    draw(this, ctx, cw, ch);
    startPeerConnection();
  },
  0
);

function draw(v, c, w, h) {
  if (!v.paused && !v.ended) {
    c.drawImage(v, 0, 0, w, h);
    setTimeout(draw, 1000 / 60, v, c, w, h);
  }
}

async function startPeerConnection() {
  console.log('initiating peer connection');
  const canvasStream = canvas.captureStream();
  const videoTracks = canvasStream.getVideoTracks();
  const sendStream = new MediaStream();

  const yourConnection = new RTCPeerConnection();
  const theirConnection = new RTCPeerConnection();

  window.yourConnection = yourConnection;

  theirConnection.onaddstream = function (e) {
    remote.srcObject = e.stream;
  };

  yourConnection.onicecandidate = function (event) {
    if (event.candidate) {
      theirConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  };

  theirConnection.onicecandidate = function (event) {
    if (event.candidate) {
      yourConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  };

  // enable simulcast encodings
  // the receiver should by default get the first encoding (half size)

  for (const track of videoTracks) {
    console.log('adding track', track);
    yourConnection.addTransceiver(track, {
      direction: 'sendonly',
      streams: [sendStream],
      sendEncodings: ENCODINGS,
    });
  }

  yourConnection.createOffer(
    function (offer) {
      // enable simulcast
      const res = sdpTransform.parse(offer.sdp);
      const media = res.media[0];

      media.fmtp = FTMP;
      media.rtcpFb = RTCP_FB;
      media.rtp = RTP;

      offer.sdp = sdpTransform.write(res);

      console.log('Your SDP Offer', offer.sdp);

      yourConnection.setLocalDescription(offer);
      theirConnection.setRemoteDescription(offer);

      theirConnection.createAnswer(
        function (answer) {
          // force H264 for theirConnection
          const parsedAnswer = sdpTransform.parse(answer.sdp);
          const answerMedia = parsedAnswer.media[0];

          answerMedia.fmtp = FTMP;
          answerMedia.rtcpFb = RTCP_FB;
          answerMedia.rtp = RTP;

          answer.sdp = sdpTransform.write(parsedAnswer);

          console.log('Their SDP Answer', answer.sdp);

          theirConnection.setLocalDescription(answer);
          yourConnection.setRemoteDescription(answer);
        },
        function (error) {
          console.log(error);
        }
      );
    },
    function (error) {
      console.log(error);
    }
  );
}

/*

function call() {
  const stream = canvas.captureStream();
  console.log('Got stream from canvas');
  console.log('Starting call');
  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = e => onIceCandidate(pc1, e);
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = e => onIceCandidate(pc2, e);
  pc1.oniceconnectionstatechange = e => onIceStateChange(pc1, e);
  pc2.oniceconnectionstatechange = e => onIceStateChange(pc2, e);
  pc2.ontrack = gotRemoteStream;

  stream.getTracks().forEach(track => {
    pc1.addTrack(track, stream);
  });
  console.log('Added local stream to pc1');

  console.log('pc1 createOffer start');
  pc1.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError, offerOptions);
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function onCreateOfferSuccess(desc) {
  // console.log(`Offer from pc1\n${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc, () => onSetLocalSuccess(pc1), onSetSessionDescriptionError);
  console.log('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc, () => onSetRemoteSuccess(pc2), onSetSessionDescriptionError);
  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError);
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteStream(e) {
  if (video.srcObject !== e.streams[0]) {
    video.srcObject = e.streams[0];
    console.log('pc2 received remote stream');
  }
}

function onCreateAnswerSuccess(desc) {
  console.log('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc, () => onSetLocalSuccess(pc2), onSetSessionDescriptionError);
  console.log('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc, () => onSetRemoteSuccess(pc1), onSetSessionDescriptionError);
}

function onIceCandidate(pc, event) {
  getOtherPc(pc)
    .addIceCandidate(event.candidate)
    .then(
      () => onAddIceCandidateSuccess(pc),
      err => onAddIceCandidateError(pc, err)
    );
  console.log(
    `${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`
  );
}

function onAddIceCandidateSuccess(pc) {
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function getName(pc) {
  return pc === pc1 ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return pc === pc1 ? pc2 : pc1;
}

*/
