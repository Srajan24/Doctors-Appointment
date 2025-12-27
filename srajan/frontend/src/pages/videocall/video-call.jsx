import { useLocation } from "react-router-dom";
import VideoCall from "./video-call-ui";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function VideoCallPage() {
  const query = useQuery();
  const channel = query.get("channel"); // previously sessionId
  const tokenParam = query.get("token");
  const token = tokenParam ? decodeURIComponent(tokenParam) : null;
  const appId = query.get("appId");
  const uid = query.get("uid") ;

  if (!channel) return <p>Invalid video call parameters.</p>;

  return <VideoCall channel={channel} token={token} appId={appId} uid={uid} />;
}
