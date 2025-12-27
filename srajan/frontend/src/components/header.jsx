import React, { useEffect, useRef, useState } from "react";
import {
    Calendar,
    CreditCard,
    ShieldCheck,
    Stethoscope,
    User,
    Phone,
    PhoneIncoming,
} from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Badge } from "./ui/badge";
import useCheckUser from "../hooks/useCheckUser";
import { useCredits } from "../actions/credits";
import { useUserContext } from "../userContext/userContext";

export default function Header() {
    const { isSignedIn, backendUser: user } = useCheckUser();
    const { backendUser, checkAndAllocateCredits } = useCredits();
    const { userInfo } = useUserContext()
    const [allocatCredit, setAllocateCredit] = useState(false);

    const allocatedRef = useRef(false);

    useEffect(() => {
        const allocate = async () => {
            if (userInfo?.role === "patient" && !allocatedRef.current) {
                allocatedRef.current = true; // ✅ lock forever
                await checkAndAllocateCredits();
            }
        };

        allocate();
    }, [userInfo]);



    return (
        <>
            <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-10 supports-[backdrop-filter]:bg-background/60">
                <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 cursor-pointer">
                        <img
                            src="/logo-single.png"
                            alt="Medimeet Logo"
                            width={200}
                            height={60}
                            className="h-10 w-auto object-contain"
                        />
                    </Link>

                    <div className="flex items-center space-x-2">
                        <SignedIn>
                            {/* Admin Links */}
                            {user?.role === "admin" && (
                                <Link to="/admin">
                                    <Button
                                        variant="outline"
                                        className="hidden md:inline-flex items-center gap-2"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        Admin Dashboard
                                    </Button>
                                    <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                                        <ShieldCheck className="h-4 w-4" />
                                    </Button>
                                </Link>
                            )}

                            {/* Doctor Links */}
                            {user?.role === "doctor" && (
                                <>
                                    {/* Call requests UI disabled */}
                                    <Link to="/doctor">
                                        <Button
                                            variant="outline"
                                            className="hidden md:inline-flex items-center gap-2"
                                        >
                                            <Stethoscope className="h-4 w-4" />
                                            Dashboard
                                        </Button>
                                        <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                                            <Stethoscope className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </>
                            )}

                            {/* Patient Links */}
                            {user?.role === "patient" && (
                                <>
                                    {/* Emergency call UI disabled */}
                                    <Link to="/appointments">
                                        <Button
                                            variant="outline"
                                            className="hidden md:inline-flex items-center gap-2"
                                        >
                                            <Calendar className="h-4 w-4" />
                                            Appointments
                                        </Button>
                                        <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </>
                            )}

                            {/* Unassigned Role */}
                            {user?.role === "unassigned" && (
                                <Link to="/on-boarding">
                                    <Button
                                        variant="outline"
                                        className="hidden md:inline-flex items-center gap-2"
                                    >
                                        <User className="h-4 w-4" />
                                        Complete Profile
                                    </Button>
                                    <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                                        <User className="h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </SignedIn>

                        {(!user || user?.role !== "admin") && (
                            <Link to={user?.role === "patient" ? "/pricing" : "/doctor"}>
                                <Badge
                                    variant="outline"
                                    className="h-9 bg-emerald-900/20 border-emerald-700/30 px-3 py-1 flex items-center gap-2"
                                >
                                    <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">
                                        {userInfo && userInfo.role !== "admin" ? (
                                            <>
                                                {userInfo?.credits}{" "}
                                                <span className="hidden md:inline">
                                                    {userInfo?.role === "patient"
                                                        ? "Credits"
                                                        : "Earned Credits"}
                                                </span>
                                            </>
                                        ) : (
                                            <>Pricing</>
                                        )}
                                    </span>
                                </Badge>
                            </Link>
                        )}

                        <SignedOut>
                            <SignInButton>
                                <Button variant="secondary">Sign In</Button>
                            </SignInButton>
                        </SignedOut>

                        <SignedIn>
                            <UserButton
                                appearance={{
                                    elements: {
                                        avatarBox: "w-10 h-10",
                                        userButtonPopoverCard: "shadow-xl",
                                        userPreviewMainIdentifier: "font-semibold",
                                    },
                                }}
                                afterSignOutUrl="/"
                            />
                        </SignedIn>
                    </div>
                </nav>
            </header >
        </>
    );
}
