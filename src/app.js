import './main.css';

import * as sdpTransform from 'sdp-transform';

import {ENCODINGS, FTMP, RTCP_FB, RTP} from './rtc_consts.js';

const canvas = document.querySelector('canvas');

const ctx = canvas.getContext('2d');

const remoteFull = document.getElementById('remote-full');
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
    remoteFull.srcObject = e.stream;
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
