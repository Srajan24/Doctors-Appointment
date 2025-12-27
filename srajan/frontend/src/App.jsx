import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "./components/header"
import { Route, Routes } from "react-router-dom"
import Home from "./pages/home"
import DoctorsPage from "./pages/doctors/speciality"
import PricingPage from "./pages/pricing/pricing"
import OnboardingPage from "./pages/onBoarding/onBoardingPage"
import VerificationPage from "./pages/doctors/verification/verification"
import AdminPage from "./pages/admin/adminPage"
import DoctorSpecialtyPage from "./pages/doctors/doctorSpecialityListing"
import DoctorDashboardPage from "./pages/doctors/doctorDashboardPage"
import DoctorProfilePage from "./pages/doctors/doctorProfile"
import PatientAppointmentsPage from "./pages/appointments/appointments-page"
import Unauthorized from "./pages/Unauthorized"
import ProtectedRoute from "./routes/ProtectedRoute"
import SinginPage from "./routes/auth/singin"
import SignupPage from "./routes/auth/signup"
import DoctorEarnings from "./pages/doctors/doctorEarningsPage"
// Video / instant-call pages removed to avoid runtime errors

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SinginPage />} />
        <Route path="/sign-up" element={<SignupPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path='/pricing' element={<PricingPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path='/on-boarding' element={<OnboardingPage />} />
          <Route path='/appointments' element={<PatientAppointmentsPage />} />
          <Route path='/doctors' element={<DoctorsPage />} />
          <Route path='/doctors/:speciality' element={<DoctorSpecialtyPage />} />
          <Route path='/doctors/:speciality/:doctorId' element={<DoctorProfilePage />} />
          {/* Video / emergency call routes disabled */}
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
          <Route path='/doctor' element={<DoctorDashboardPage />} />
          <Route path='/doctor/verification' element={<VerificationPage />} />
          <Route path='/doctor-payments' element={<DoctorEarnings />} />
          {/* Doctor call requests UI disabled */}
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path='/admin' element={<AdminPage />} />
        </Route>

      </Routes>
    </ThemeProvider>
  )
}


export default App