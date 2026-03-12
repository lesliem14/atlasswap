"use client";

import { useState, useEffect, useCallback } from "react";
import { connectWallet, getConnectedAccount } from "@/lib/connectWallet";

/**
 * Connect Wallet button with MetaMask: address display, disconnect, and
 * refresh on account/chain changes.
 */
export default function ConnectWalletButton({ className = "", style = {} }) {
  const [address, setAddress] = useState(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateAddress = useCallback(async () => {
    const result = await getConnectedAccount();
    setAddress(result?.address ?? null);
  }, []);

  // Restore connection on mount & listen for account/chain changes
  useEffect(() => {
    updateAddress();

    const ethereum = typeof window !== "undefined" ? window.ethereum : null;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts) => {
      setAddress(accounts?.length > 0 ? accounts[0] : null);
      setError(null);
    };

    const handleChainChanged = () => {
      // MetaMask recommends reload on chain change; we refresh state
      updateAddress();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [updateAddress]);

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const result = await connectWallet();
      if (result.success) {
        setAddress(result.address);
      } else {
        setError(result.error);
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setError(null);
    setDropdownOpen(false);
  }

  async function handleCopyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy");
    }
  }

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        position: "relative",
      }}
    >
      {address ? (
        <>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className={className}
            style={{
              background: "linear-gradient(135deg, #00E5A0, #00C4FF)",
              border: "none",
              borderRadius: 10,
              padding: "9px 20px",
              color: "#070B14",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.03em",
              boxShadow: "0 4px 16px rgba(0,229,160,0.25)",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...style,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#070B14",
              }}
            />
            {shortAddress}
            <span style={{ fontSize: 10, opacity: 0.8 }}>▼</span>
          </button>

          {dropdownOpen && (
            <>
              <div
                onClick={() => setDropdownOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 99,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 100,
                  background: "#0C1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: 14,
                  minWidth: 260,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(240,244,255,0.4)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  CONNECTED ADDRESS
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "#fff",
                    wordBreak: "break-all",
                    marginBottom: 12,
                  }}
                >
                  {address}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCopyAddress}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "rgba(0,229,160,0.15)",
                      border: "1px solid rgba(0,229,160,0.3)",
                      borderRadius: 8,
                      color: "#00E5A0",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "rgba(255,90,114,0.15)",
                      border: "1px solid rgba(255,90,114,0.3)",
                      borderRadius: 8,
                      color: "#FF5A72",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className={className}
          style={{
            background: "linear-gradient(135deg, #00E5A0, #00C4FF)",
            border: "none",
            borderRadius: 10,
            padding: "9px 20px",
            color: "#070B14",
            fontWeight: 700,
            fontSize: 13,
            cursor: connecting ? "wait" : "pointer",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "0.03em",
            boxShadow: "0 4px 16px rgba(0,229,160,0.25)",
            transition: "all 0.2s",
            ...style,
          }}
        >
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}

      {error && (
        <span
          style={{
            fontSize: 11,
            color: "#FF5A72",
            maxWidth: 200,
            textAlign: "right",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
