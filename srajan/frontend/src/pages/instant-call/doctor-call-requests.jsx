import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { 
  Phone, 
  PhoneOff, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  getDoctorPendingCalls,
  respondToInstantCall,
  toggleInstantCallAvailability
} from "../../actions/instantCall";
import { getCurrentUser } from "../../actions/onBoarding";

export default function DoctorCallRequests() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchPendingCalls();
      checkAvailability();
      
      // Poll for new calls every 5 seconds
      const interval = setInterval(fetchPendingCalls, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAvailability = async () => {
    try {
      const userData = await getCurrentUser(user.id);
      setIsAvailable(userData.isAvailableForInstantCall || false);
    } catch (error) {
      console.error("Error checking availability:", error);
    }
  };

  const fetchPendingCalls = async () => {
    try {
      setLoading(true);
      const data = await getDoctorPendingCalls(user.id);
      setCalls(data.calls || []);
    } catch (error) {
      console.error("Error fetching calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setToggling(true);
      const data = await toggleInstantCallAvailability({
        userId: user.id,
        isAvailable: !isAvailable,
      });
      setIsAvailable(data.isAvailable);
      toast.success(data.message);
    } catch (error) {
      toast.error("Failed to update availability");
    } finally {
      setToggling(false);
    }
  };

  const handleRespond = async (callId, action) => {
    try {
      setResponding(callId);
      const data = await respondToInstantCall({
        userId: user.id,
        callId,
        action,
      });

      if (action === "accept") {
        toast.success("Call accepted! Connecting...");
        // Join video call
        const appId = import.meta.env.VITE_AGORA_APP_ID || 'c3f5a580fd8d475cba3e64eee2027e3f';
        // If backend returned signaling flag, omit token and appId
        if (data.signaling) {
          navigate(`/video-call?channel=${data.videoSessionId}&uid=${user.id}`);
        } else {
          navigate(`/video-call?channel=${data.videoSessionId}&token=${encodeURIComponent(data.videoToken)}&appId=${appId}&uid=${user.id}`);
        }
      } else {
        toast.success("Call request declined");
        fetchPendingCalls();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to respond");
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Availability Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Emergency Call Requests
            </h1>
            <p className="text-muted-foreground">
              Respond to urgent patient requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Availability Status</p>
              <Badge variant={isAvailable ? "default" : "secondary"} className="mt-1">
                {isAvailable ? "Available" : "Unavailable"}
              </Badge>
            </div>
            <Button
              onClick={handleToggleAvailability}
              disabled={toggling}
              variant={isAvailable ? "destructive" : "default"}
              className={isAvailable ? "" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isAvailable ? (
                <>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Go Offline
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Go Online
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Availability Warning */}
        {!isAvailable && (
          <Card className="mb-6 border-yellow-900/20 bg-yellow-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-white">You're Currently Offline</h3>
                  <p className="text-sm text-muted-foreground">
                    Turn on availability to receive emergency call requests from patients
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Calls */}
        {loading && calls.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : calls.length === 0 ? (
          <Card className="border-muted/20">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">No Pending Requests</h3>
                <p className="text-sm text-muted-foreground">
                  {isAvailable 
                    ? "You'll be notified when patients request emergency calls"
                    : "Enable availability to start receiving requests"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {calls.map((call) => (
              <Card key={call._id} className="border-emerald-900/20 bg-emerald-900/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-900/20 flex items-center justify-center overflow-hidden">
                        {call.patientId?.imageUrl ? (
                          <img 
                            src={call.patientId.imageUrl} 
                            alt={call.patientId.name} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <span className="text-xl text-emerald-400">
                            {call.patientId?.name?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-white">
                          {call.patientId?.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {call.patientId?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="destructive" className="text-xs">
                            EMERGENCY
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(call.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-white mb-2">Patient's Reason:</p>
                      <p className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg">
                        {call.patientReason || "No reason provided"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRespond(call._id, "reject")}
                        disabled={responding === call._id}
                        variant="outline"
                        className="flex-1"
                      >
                        {responding === call._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Decline
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleRespond(call._id, "accept")}
                        disabled={responding === call._id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {responding === call._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Accept & Join Call
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
