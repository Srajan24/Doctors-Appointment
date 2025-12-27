import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Calendar,
  Clock,
  User,
  Video,
  X,
  Edit,
  Loader2,
  CheckCircle,
  StethoscopeIcon,
} from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  addAppointmentNotes,
  cancelAppointment,
  markAppointmentCompleted,
} from "../actions/doctor-time";
import { generateVideoToken } from "../actions/appointments";
import useFetch from "../hooks/useFetch";
import { useAuth } from "@clerk/clerk-react";

export function AppointmentCard({ appointment, userRole, refetchAppointments }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState(appointment.notes || "");
  const { userId } = useAuth();
  const navigate = useNavigate();

  console.log(appointment)

  // Formatters
  const formatDateTime = (dateString) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  // Can doctor mark completed?
  const canMarkCompleted = () => {
    if (userRole.toLowerCase() !== "doctor" || appointment.status.toLowerCase() !== "scheduled")
      return false;
    const now = new Date();
    return now >= new Date(appointment.endTime);
  };

  // useFetch hooks
  const { loading: cancelLoading, fn: submitCancel, data: cancelData } =
    useFetch(cancelAppointment);
  const { loading: notesLoading, fn: submitNotes, data: notesData } =
    useFetch(addAppointmentNotes);
  const { loading: tokenLoading, fn: submitTokenRequest, data: tokenData } =
    useFetch(generateVideoToken);
  const { loading: completeLoading, fn: submitMarkCompleted, data: completeData } =
    useFetch(markAppointmentCompleted);

  // Appointment active (30 min before start until end)
  const isAppointmentActive = () => {
    const now = new Date();
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);

    return (
      (start.getTime() - now.getTime() <= 30 * 60 * 1000 && now < start) ||
      (now >= start && now <= end)
    );
  };

  // Cancel appointment
  const handleCancelAppointment = async () => {
    if (cancelLoading) return;

    if (
      window.confirm("Are you sure you want to cancel this appointment? This action cannot be undone.")
    ) {
      const formData = new FormData();
      formData.append("appointmentId", appointment._id); // ✅ Mongo uses _id
      await submitCancel({ formData, userId });
    }
  };

  // Mark as completed
  const handleMarkCompleted = async () => {
    if (completeLoading) return;

    const now = new Date();
    const appointmentEndTime = new Date(appointment.endTime);

    if (now < appointmentEndTime) {
      alert("Cannot mark appointment as completed before the scheduled end time.");
      return;
    }

    if (
      window.confirm("Are you sure you want to mark this appointment as completed?")
    ) {
      const formData = { appointmentId: appointment._id, userId };
      await submitMarkCompleted({ formData, userId });
    }
  };

  // Save doctor notes
  const handleSaveNotes = async () => {
    if (notesLoading || userRole.toLowerCase() !== "doctor") return;

    const formData = {
      appointmentId: appointment._id,
      notes,
      userId
    }
    await submitNotes({ formData, userId });
  };

  // Join video call
  const handleJoinVideoCall = async () => {
    if (!appointment.videoSessionId) {
      toast.error("Video session not available. Please try again later.");
      return;
    }
    const appId = import.meta.env.VITE_AGORA_APP_ID || 'c3f5a580fd8d475cba3e64eee2027e3f';
    // UID should be the current user's MongoDB _id
    // For patient: use appointment.patientId._id (their own ID)
    // For doctor: use appointment.doctorId._id (their own ID)
    const uid = userRole.toLowerCase() === "doctor" 
      ? (appointment.doctorId?._id || appointment.doctorId)
      : (appointment.patientId?._id || appointment.patientId);
    if (appointment.videoToken) {
      navigate(`/video-call?channel=${appointment.videoSessionId}&token=${encodeURIComponent(appointment.videoToken)}&appId=${appId}&uid=${uid}`)
    } else {
      navigate(`/video-call?channel=${appointment.videoSessionId}&uid=${uid}`)
    }
  };

  // Success effects
  useEffect(() => {
    if (cancelData?.success) {
      toast.success("Appointment cancelled successfully");
      setOpen(false);
      refetchAppointments?.(userId);
    }
  }, [cancelData, refetchAppointments]);

  useEffect(() => {
    if (completeData?.success) {
      toast.success("Appointment marked as completed");
      setOpen(false);
      refetchAppointments?.(userId);
    }
  }, [completeData, refetchAppointments]);

  useEffect(() => {
    if (notesData?.success) {
      toast.success("Notes saved successfully");
      setAction(null);
      refetchAppointments?.(userId);
    }
  }, [notesData, refetchAppointments]);

  useEffect(() => {
    if (tokenData?.success) {
      console.log('reac2')
      navigate(
        `/video-call?sessionId=${tokenData.videoSessionId}&token=${tokenData.token}&appointmentId=${appointment._id}`
      );
    } else if (tokenData?.error) {
      setAction(null);
    }
    console.log(tokenData)
  }, [tokenData, appointment._id, navigate]);

  // Other party info
  const otherParty = userRole.toLowerCase() === "doctor" ? appointment.patientId : appointment.doctorId;
  const otherPartyLabel = userRole.toLowerCase() === "doctor" ? "Patient" : "Doctor";
  const otherPartyIcon = userRole.toLowerCase() === "doctor" ? <User /> : <StethoscopeIcon />;
  
  // Safety check: if otherParty is not populated or is just an ID, return early
  if (!otherParty || typeof otherParty === 'string' || !otherParty.name) {
    return (
      <Card className="border-emerald-900/20">
        <CardContent className="p-4">
          <p className="text-muted-foreground">Loading appointment details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-emerald-900/20 hover:border-emerald-700/30 transition-all">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted/20 rounded-full p-2 mt-1">{otherPartyIcon}</div>
              <div>
                <h3 className="font-medium text-white">
                  {userRole.toLowerCase() === "doctor"
                    ? otherParty?.name
                    : `Dr. ${otherParty?.name}`}
                </h3>
                {userRole.toLowerCase() === "doctor" && (
                  <p className="text-sm text-muted-foreground">{otherParty?.email}</p>
                )}
                {userRole.toLowerCase() === "patient" && (
                  <p className="text-sm text-muted-foreground">{otherParty?.specialty}</p>
                )}
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatDateTime(appointment.startTime)}</span>
                </div>
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>
                    {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 self-end md:self-start">
              <Badge
                variant="outline"
                className={
                  appointment.status.toLowerCase() === "completed"
                    ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                    : appointment.status.toLowerCase() === "cancelled"
                      ? "bg-red-900/20 border-red-900/30 text-red-400"
                      : "bg-amber-900/20 border-amber-900/30 text-amber-400"
                }
              >
                {appointment.status}
              </Badge>

              <div className="flex gap-2 mt-2 flex-wrap">
                {canMarkCompleted() && (
                  <Button
                    size="sm"
                    onClick={handleMarkCompleted}
                    disabled={completeLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {completeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" /> Complete
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-900/30"
                  onClick={() => setOpen(true)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Modal */}
      <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
        <DialogContent className="max-w-2xl max-h-screen my-scrollable-div mt-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              {appointment.status === "scheduled"
                ? "Manage your upcoming appointment"
                : "View appointment information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Other Party Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {otherPartyLabel}
              </h4>
              <div className="flex items-center">
                <div className="h-5 w-5 text-emerald-400 mr-2">
                  {otherPartyIcon}
                </div>
                <div>
                  <p className="text-white font-medium">
                    {userRole === "doctor"
                      ? otherParty.name
                      : `Dr. ${otherParty.name}`}
                  </p>
                  {userRole === "doctor" && (
                    <p className="text-muted-foreground text-sm">{otherParty.email}</p>
                  )}
                  {userRole === "patient" && (
                    <p className="text-muted-foreground text-sm">{otherParty.specialty}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Appointment Time */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Scheduled Time</h4>
              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-emerald-400 mr-2" />
                  <p className="text-white">{formatDateTime(appointment.startTime)}</p>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-emerald-400 mr-2" />
                  <p className="text-white">
                    {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
              <Badge
                variant="outline"
                className={
                  appointment.status === "completed"
                    ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                    : appointment.status === "cancelled"
                      ? "bg-red-900/20 border-red-900/30 text-red-400"
                      : "bg-amber-900/20 border-amber-900/30 text-amber-400"
                }
              >
                {appointment.status}
              </Badge>
            </div>

            {/* Patient Description */}
            {appointment.patientDescription && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {userRole === "DOCTOR" ? "Patient Description" : "Your Description"}
                </h4>
                <div className="p-3 rounded-md bg-muted/20 border border-emerald-900/20">
                  <p className="text-white whitespace-pre-line">{appointment.patientDescription}</p>
                </div>
              </div>
            )}

            {/* Join Video Call Button */}
            {appointment.status === "scheduled" && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Video Consultation</h4>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  // disabled={!isAppointmentActive() || action === "video" || tokenLoading}
                  onClick={handleJoinVideoCall}
                >
                  {tokenLoading || action === "video" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Video Call...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      {isAppointmentActive()
                        ? "Join Video Call"
                        : "Video call will be available 30 minutes before appointment"}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Doctor Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Doctor Notes</h4>
                {userRole === "doctor" && action !== "notes" && appointment.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAction("notes")}
                    className="h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    {appointment.notes ? "Edit" : "Add"}
                  </Button>
                )}
              </div>

              {userRole === "doctor" && action === "notes" ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter your clinical notes here..."
                    className="bg-background border-emerald-900/20 min-h-[100px]"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAction(null);
                        setNotes(appointment.notes || "");
                      }}
                      disabled={notesLoading}
                      className="border-emerald-900/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={notesLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {notesLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Notes"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-muted/20 border border-emerald-900/20 min-h-[80px]">
                  {appointment.notes ? (
                    <p className="text-white whitespace-pre-line">{appointment.notes}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No notes added yet</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <div className="flex gap-2">
              {canMarkCompleted() && (
                <Button
                  onClick={handleMarkCompleted}
                  disabled={completeLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {completeLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </>
                  )}
                </Button>
              )}

              {appointment.status === "scheduled" && (
                <Button
                  variant="outline"
                  onClick={handleCancelAppointment}
                  disabled={cancelLoading}
                  className="border-red-900/30 text-red-400 hover:bg-red-900/10 mt-3 sm:mt-0"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel Appointment
                    </>
                  )}
                </Button>
              )}
            </div>

            <Button onClick={() => setOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
