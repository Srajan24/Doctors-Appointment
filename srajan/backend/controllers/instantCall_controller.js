import User from "../models/user_model.js";
import InstantCall from "../models/instantCall_model.js";
import CreditTransaction from "../models/creditTransaction_model.js";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Agora from "agora-access-token";

const { RtcTokenBuilder, RtcRole } = Agora;

// Get all available doctors for instant calls
export const getAvailableDoctors = async (req, res) => {
  try {
    const doctors = await User.find({
      role: "doctor",
      verificationStatus: "verified",
      isAvailableForInstantCall: true,
    }).select("name email specialty experience imageUrl instantCallPrice");

    res.json({ success: true, doctors });
  } catch (error) {
    console.error("Error fetching available doctors:", error);
    res.status(500).json({ error: "Failed to fetch available doctors" });
  }
};

// Request instant call
export const requestInstantCall = async (req, res) => {
  try {
    const { userId, doctorId, reason } = req.body;

    if (!userId || !doctorId) {
      return res.status(400).json({ error: "User ID and Doctor ID are required" });
    }

    // Find patient
    const patient = await User.findOne({ clerkUserId: userId, role: "patient" });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Find doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // Check if doctor is available
    if (!doctor.isAvailableForInstantCall) {
      return res.status(400).json({ error: "Doctor is not available for instant calls" });
    }

    // Check patient credits
    const requiredCredits = doctor.instantCallPrice || 3;
    if (patient.credits < requiredCredits) {
      return res.status(400).json({ 
        error: `Insufficient credits. Need ${requiredCredits} credits for emergency call` 
      });
    }

    // Check for existing pending call
    const existingCall = await InstantCall.findOne({
      patientId: patient._id,
      status: "pending",
    });

    if (existingCall) {
      return res.status(400).json({ 
        error: "You already have a pending call request" 
      });
    }

    // Create instant call request
    const instantCall = await InstantCall.create({
      patientId: patient._id,
      doctorId: doctor._id,
      patientReason: reason,
      creditsDeducted: requiredCredits,
      status: "pending",
    });

    // Populate patient and doctor info
    await instantCall.populate("patientId doctorId");

    res.json({ 
      success: true, 
      instantCall,
      message: "Call request sent to doctor. Waiting for approval..." 
    });
  } catch (error) {
    console.error("Error requesting instant call:", error);
    res.status(500).json({ error: "Failed to request instant call" });
  }
};

// Doctor accepts/rejects instant call
export const respondToInstantCall = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, callId, action } = req.body; // action: "accept" or "reject"

    if (!userId || !callId || !action) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find doctor
    const doctor = await User.findOne({ clerkUserId: userId, role: "doctor" }).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Doctor not found" });
    }

    // Find instant call
    const instantCall = await InstantCall.findById(callId)
      .populate("patientId")
      .session(session);

    if (!instantCall) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Call request not found" });
    }

    // Verify doctor owns this call
    if (instantCall.doctorId.toString() !== doctor._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if call is still pending
    if (instantCall.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({ error: "Call request already processed" });
    }

    if (action === "reject") {
      // Reject the call
      instantCall.status = "rejected";
      await instantCall.save({ session });

      await session.commitTransaction();
      return res.json({ 
        success: true, 
        message: "Call request rejected" 
      });
    }

    if (action === "accept") {
      // Accept the call - create video session
      const rawChannel = `instant_call_${uuidv4().replace(/-/g, "_")}`;
      const channelName = rawChannel.slice(0, 64);

      // If Agora env vars are present, generate a token. Otherwise return a signaling-based session.
      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;
      let token = null;
      let usingSignaling = false;

      if (appId && appCertificate) {
        const role = RtcRole.PUBLISHER;
        const expireTime = 3600; // 1 hour
        const currentTime = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTime + expireTime;

        token = RtcTokenBuilder.buildTokenWithUid(
          appId,
          appCertificate,
          channelName,
          doctor._id.toString(),
          role,
          privilegeExpireTime
        );
      } else {
        // No Agora credentials — fallback to Socket.IO WebRTC signaling
        usingSignaling = true;
        token = null; // client will use signaling flow
      }

      // Deduct credits from patient
      const patient = instantCall.patientId;
      patient.credits -= instantCall.creditsDeducted;
      await patient.save({ session });

      // Add credits to doctor
      doctor.credits += instantCall.creditsDeducted;
      await doctor.save({ session });

      // Create credit transactions
      await CreditTransaction.create([
        {
          userId: patient._id,
          amount: -instantCall.creditsDeducted,
          type: "INSTANT_CALL",
          note: `Emergency call with Dr. ${doctor.name}`,
        },
        {
          userId: doctor._id,
          amount: instantCall.creditsDeducted,
          type: "INSTANT_CALL",
          note: `Emergency call with ${patient.name}`,
        },
      ], { session });

      // Update instant call
      instantCall.status = "accepted";
      instantCall.videoSessionId = channelName;
      instantCall.videoToken = token; // may be null for signaling mode
      instantCall.usingSignaling = usingSignaling;
      instantCall.startTime = new Date();
      await instantCall.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        instantCall,
        videoSessionId: channelName,
        videoToken: token,
        signaling: usingSignaling,
        appId: appId,
        message: "Call accepted! Connecting to video..."
      });
    }

    await session.abortTransaction();
    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error responding to instant call:", error);
    res.status(500).json({ error: "Failed to process call request" });
  } finally {
    session.endSession();
  }
};

// Get pending instant calls for doctor
export const getDoctorPendingCalls = async (req, res) => {
  try {
    const { userId } = req.query;

    const doctor = await User.findOne({ clerkUserId: userId, role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const pendingCalls = await InstantCall.find({
      doctorId: doctor._id,
      status: "pending",
    })
      .populate("patientId", "name email imageUrl")
      .sort({ createdAt: -1 });

    res.json({ success: true, calls: pendingCalls });
  } catch (error) {
    console.error("Error fetching pending calls:", error);
    res.status(500).json({ error: "Failed to fetch pending calls" });
  }
};

// Get patient's instant call status
export const getPatientCallStatus = async (req, res) => {
  try {
    const { userId } = req.query;

    const patient = await User.findOne({ clerkUserId: userId, role: "patient" });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const activeCall = await InstantCall.findOne({
      patientId: patient._id,
      status: { $in: ["pending", "accepted"] },
    })
      .populate("doctorId", "name email specialty imageUrl")
      .sort({ createdAt: -1 });

    res.json({ success: true, call: activeCall });
  } catch (error) {
    console.error("Error fetching call status:", error);
    res.status(500).json({ error: "Failed to fetch call status" });
  }
};

// Toggle doctor availability for instant calls
export const toggleInstantCallAvailability = async (req, res) => {
  try {
    const { userId, isAvailable } = req.body;

    const doctor = await User.findOne({ clerkUserId: userId, role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    doctor.isAvailableForInstantCall = isAvailable;
    await doctor.save();

    res.json({ 
      success: true, 
      isAvailable: doctor.isAvailableForInstantCall,
      message: isAvailable 
        ? "You are now available for emergency calls" 
        : "You are no longer available for emergency calls"
    });
  } catch (error) {
    console.error("Error toggling availability:", error);
    res.status(500).json({ error: "Failed to update availability" });
  }
};

// End instant call
export const endInstantCall = async (req, res) => {
  try {
    const { userId, callId } = req.body;

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const instantCall = await InstantCall.findById(callId);
    if (!instantCall) {
      return res.status(404).json({ error: "Call not found" });
    }

    // Verify user is part of the call
    if (
      instantCall.patientId.toString() !== user._id.toString() &&
      instantCall.doctorId.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update call status
    instantCall.status = "completed";
    instantCall.endTime = new Date();
    
    // Calculate duration in minutes
    if (instantCall.startTime) {
      const duration = Math.round((instantCall.endTime - instantCall.startTime) / (1000 * 60));
      instantCall.duration = duration;
    }

    await instantCall.save();

    res.json({ success: true, message: "Call ended successfully" });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ error: "Failed to end call" });
  }
};
