import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { 
  Phone, 
  Video, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { 
  getAvailableDoctors, 
  requestInstantCall,
  getPatientCallStatus 
} from "../../actions/instantCall";

export default function EmergencyCallPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [reason, setReason] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchAvailableDoctors();
    checkCallStatus();
    
    // Poll for call status every 3 seconds
    const interval = setInterval(checkCallStatus, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchAvailableDoctors = async () => {
    try {
      setLoading(true);
      const data = await getAvailableDoctors();
      setDoctors(data.doctors || []);
    } catch (error) {
      toast.error("Failed to load available doctors");
    } finally {
      setLoading(false);
    }
  };

  const checkCallStatus = async () => {
    if (!user?.id) return;
    
    try {
      setCheckingStatus(true);
      const data = await getPatientCallStatus(user.id);
      setCallStatus(data.call);
      
      // If call was accepted, join the video call
      if (data.call?.status === "accepted" && data.call.videoSessionId) {
        const appId = import.meta.env.VITE_AGORA_APP_ID || 'c3f5a580fd8d475cba3e64eee2027e3f';
        if (data.call.signaling) {
          navigate(`/video-call?channel=${data.call.videoSessionId}&uid=${data.call.patientId._id || data.call.patientId}`);
        } else {
          navigate(`/video-call?channel=${data.call.videoSessionId}&token=${encodeURIComponent(data.call.videoToken)}&appId=${appId}&uid=${data.call.patientId._id || data.call.patientId}`);
        }
      }
    } catch (error) {
      console.error("Error checking call status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRequestCall = async () => {
    if (!reason.trim()) {
      toast.error("Please describe your emergency");
      return;
    }

    try {
      setRequesting(true);
      const data = await requestInstantCall({
        userId: user.id,
        doctorId: selectedDoctor._id,
        reason,
      });
      
      toast.success(data.message || "Call request sent!");
      setSelectedDoctor(null);
      setReason("");
      checkCallStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to request call");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🚨 Emergency Call Now
          </h1>
          <p className="text-muted-foreground">
            Connect instantly with available doctors for urgent consultations
          </p>
        </div>

        {/* Call Status */}
        {callStatus && (
          <Card className="mb-6 border-emerald-900/20 bg-emerald-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {callStatus.status === "pending" && (
                  <>
                    <Clock className="h-8 w-8 text-yellow-400 animate-pulse" />
                    <div>
                      <h3 className="font-semibold text-white">Waiting for Doctor's Response</h3>
                      <p className="text-sm text-muted-foreground">
                        Dr. {callStatus.doctorId?.name} will respond shortly...
                      </p>
                    </div>
                  </>
                )}
                {callStatus.status === "rejected" && (
                  <>
                    <XCircle className="h-8 w-8 text-red-400" />
                    <div>
                      <h3 className="font-semibold text-white">Call Request Declined</h3>
                      <p className="text-sm text-muted-foreground">
                        Please try another doctor
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Doctors */}
        {doctors.length === 0 ? (
          <Card className="border-yellow-900/20 bg-yellow-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-white">No Doctors Available</h3>
                  <p className="text-sm text-muted-foreground">
                    No doctors are currently available for emergency calls. Please try booking a regular appointment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {doctors.map((doctor) => (
              <Card key={doctor._id} className="border-emerald-900/20 hover:border-emerald-700/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-full bg-emerald-900/20 flex items-center justify-center overflow-hidden">
                        {doctor.imageUrl ? (
                          <img src={doctor.imageUrl} alt={doctor.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl text-emerald-400">
                            {doctor.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          Dr. {doctor.name}
                        </h3>
                        <p className="text-sm text-emerald-400">{doctor.specialty}</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.experience} years experience
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400">Available Now</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-2">
                        {doctor.instantCallPrice || 3} credits
                      </p>
                      <Button
                        onClick={() => setSelectedDoctor(doctor)}
                        disabled={callStatus?.status === "pending"}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Emergency Call</DialogTitle>
              <DialogDescription>
                Dr. {selectedDoctor?.name} will be notified immediately
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Describe your emergency *
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please briefly describe your medical emergency..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="bg-yellow-900/10 border border-yellow-900/20 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  ⚠️ Emergency calls cost {selectedDoctor?.instantCallPrice || 3} credits
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDoctor(null)}
                  className="flex-1"
                  disabled={requesting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestCall}
                  disabled={requesting || !reason.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Request Call
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
