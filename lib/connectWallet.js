/**
 * Get currently connected account (no user prompt).
 * @returns {{ address: string } | null }
 */
export async function getConnectedAccount() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      return { address: accounts[0] };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Connect to MetaMask with proper error handling.
 * Prevents "Failed to connect to MetaMask" from propagating as uncaught errors.
 * @returns {{ success: boolean, address?: string, error?: string }}
 */
export async function connectWallet() {
  if (typeof window === "undefined") {
    return { success: false, error: "Connect wallet in your browser" };
  }

  const ethereum = window.ethereum;
  if (!ethereum) {
    return {
      success: false,
      error: "MetaMask not installed. Install MetaMask from metamask.io",
    };
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      return { success: true, address: accounts[0] };
    }
    return { success: false, error: "No accounts found" };
  } catch (err) {
    if (err.code === 4001) {
      return { success: false, error: "Connection request was rejected" };
    }
    if (err.code === -32603) {
      return { success: false, error: "Connection request was rejected" };
    }
    if (err.message?.toLowerCase().includes("already pending")) {
      return { success: false, error: "Please approve the request in MetaMask" };
    }
    if (err.message?.toLowerCase().includes("locked") || err.message?.toLowerCase().includes("unlock")) {
      return { success: false, error: "Please unlock MetaMask and try again" };
    }
    return { success: false, error: err.message || "Could not connect to MetaMask" };
  }
}
