module.exports = {
  ENCODINGS: [
    {
      rid: 'r0',
      scalabilityMode: 'S1T3',
      scaleResolutionDownBy: 2,
      maxBitrate: 300000,
    },
    {
      rid: 'r1',
      scalabilityMode: 'S1T3',
      scaleResolutionDownBy: 1,
      maxBitrate: 600000,
    },
  ],

  FTMP: [
    {
      payload: 125,
      config: 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
    },
    {payload: 107, config: 'apt=125'},
  ],

  RTCP_FB: [
    {payload: 125, type: 'goog-remb'},
    {payload: 125, type: 'transport-cc'},
    {payload: 125, type: 'ccm', subtype: 'fir'},
    {payload: 125, type: 'nack'},
    {payload: 125, type: 'nack', subtype: 'pli'},
  ],

  RTP: [
    {payload: 125, codec: 'H264', rate: 90000},
    {payload: 107, codec: 'rtx', rate: 90000},
  ],
};
