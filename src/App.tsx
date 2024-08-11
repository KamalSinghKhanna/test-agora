
import  { useState } from "react";
import AgoraUIKit from "agora-react-uikit";
const App = () => {
  const [videoCall, setVideoCall] = useState(false);
  const rtcProps = {
    appId: "4ee1725c02cf4518afbec155694446a6",
    channel: "test",
    token: null,
  };
  const callbacks = {
    EndCall: () => setVideoCall(false),
  };
  const rtmProps = {};
  const styleProps = {};
  return videoCall ? (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      <AgoraUIKit
        rtcProps={rtcProps}
        callbacks={callbacks}
        rtmProps={rtmProps}
        styleProps={styleProps}
      />
    </div>
  ) : (
    <h3 onClick={() => setVideoCall(true)}>Start Call</h3>
  );
};
export default App;
