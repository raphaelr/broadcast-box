import React from 'react'
import { useLocation } from 'react-router-dom'

function parseBool(x) {
  return x === '1' || x === 'true';
}

let mediaOptions = {
  audio: { },
  video: { facingMode: 'environment' },
}
let kbps = 3500;
let initialGdm = false;

const query = new URLSearchParams(location.search);
if (query.has('fm')) {
  mediaOptions.video.facingMode = query.get('fm');
}
if (query.has('a')) {
  let ar = query.get('a');
  if (ar.includes('_')) {
    let [numerator, denominator] = ar.split('_');
    mediaOptions.video.aspectRatio = parseFloat(numerator)/parseFloat(denominator);
  } else {
    mediaOptions.video.aspectRatio = parseFloat(ar);
  }
}
if (query.has('r')) {
  mediaOptions.video.frameRate = parseFloat(query.get('r'));
}
if (query.has('h')) {
  mediaOptions.video.height = parseFloat(query.get('h'));
}
if (query.has('w')) {
  mediaOptions.video.width = parseFloat(query.get('w'));
}
for (const [k, v] of query) {
  if (k.startsWith('vs.')) {
    mediaOptions.video[k.substring(3)] = v;
  }
  if (k.startsWith('vf.')) {
    mediaOptions.video[k.substring(3)] = parseFloat(v);
  }
  if (k.startsWith('vb.')) {
    mediaOptions.video[k.substring(3)] = parseBool(v);
  }
  if (k.startsWith('as.')) {
    mediaOptions.audio[k.substring(3)] = v;
  }
  if (k.startsWith('af.')) {
    mediaOptions.audio[k.substring(3)] = parseFloat(v);
  }
  if (k.startsWith('ab.')) {
    mediaOptions.audio[k.substring(3)] = parseBool(v);
  }
}
if (query.has('ve')) {
  if (!parseBool(query.get('ve'))) {
    mediaOptions.video = false;
  }
}
if (query.has('ae')) {
  if (!parseBool(query.get('ae'))) {
    mediaOptions.audio = false;
  }
}
if (query.has('br')) {
  kbps = parseFloat(query.get('br'));
}
if (query.has('gdm')) {
  initialGdm = parseBool(query.get('gdm'));
}

function Player(props) {
  const videoRef = React.useRef(null)
  const location = useLocation()
  const [mediaAccessError, setMediaAccessError] = React.useState(null);
  const [publishSuccess, setPublishSuccess] = React.useState(false);
  const [useDisplayMedia, setUseDisplayMedia] = React.useState(initialGdm);

  React.useEffect(() => {
    const peerConnection = new RTCPeerConnection() // eslint-disable-line
    let stream = null

    const mediaPromise = useDisplayMedia ?
      navigator.mediaDevices.getDisplayMedia(mediaOptions) :
      navigator.mediaDevices.getUserMedia(mediaOptions)

    mediaPromise.then(s => {
      if (peerConnection.connectionState === "closed") {
        s.getTracks().forEach(t => t.stop())
        return;
      }

      stream = s
      videoRef.current.srcObject = s

      s.getTracks().forEach(t => {
        if (t.kind === 'audio') {
          peerConnection.addTransceiver(t, {direction: 'sendonly'})
        } else {
          peerConnection.addTransceiver(t, {
            direction: 'sendonly',
            sendEncodings: [
              {
                rid: 'high',
                maxBitrate: kbps*1024
              }
            ]
          })
        }
      })

      peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer)

        fetch(`${process.env.REACT_APP_API_PATH}/whip`, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${location.pathname.substring(1).replace('publish/', '')}`,
            'Content-Type': 'application/sdp'
          }
        }).then(r => {
          return r.text()
        }).then(answer => {
          peerConnection.setRemoteDescription({
            sdp: answer,
            type: 'answer'
          })
          setPublishSuccess(true)
        })
      })
    }, setMediaAccessError)

    return function cleanup() {
      peerConnection.close()
      if (stream !== null) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [videoRef, useDisplayMedia, location.pathname])

  return (
    <div className='container mx-auto'>
      {mediaAccessError != null && <MediaAccessError>{mediaAccessError}</MediaAccessError>}
      {publishSuccess === true && <PublishSuccess />}
      <video
        ref={videoRef}
        autoPlay
        muted
        controls
        playsInline
        className='w-full h-full'
      />

      <button
        onClick={() => { setUseDisplayMedia(!useDisplayMedia)}}
        className="appearance-none border w-full mt-5 py-2 px-3 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-700 text-white rounded shadow-md placeholder-gray-200">
          {!useDisplayMedia && <> Publish Screen/Window/Tab instead </>}
          {useDisplayMedia && <> Publish Webcam instead </>}
      </button>
    </div>
  )
}

const mediaErrorMessages = {
  NotAllowedError: `You can't publish stream using your camera, because you have blocked access to it 😞`,
  NotFoundError: `Seems like you don't have camera 😭 Or you just blocked access to it...\n` +
    `Check camera settings, browser permissions and system permissions.`,
}

function MediaAccessError({ children: error }) {
  return (
    <p className={'bg-red-700 text-white text-lg ' +
      'text-center p-5 rounded-t-lg whitespace-pre-wrap'
    }>
      {mediaErrorMessages[error.name] ?? 'Could not access your media device:\n' + error}
    </p>
  )
}

function PublishSuccess() {
  const subscribeUrl = window.location.href.replace('publish/', '')

  return (
    <p className={'bg-green-800 text-white text-lg ' +
      'text-center p-5 rounded-t-lg whitespace-pre-wrap'
    }>
      Live: Currently streaming to <a href={subscribeUrl} target="_blank" rel="noreferrer" className="hover:underline">{subscribeUrl}</a>
    </p>
  )
}

export default Player
