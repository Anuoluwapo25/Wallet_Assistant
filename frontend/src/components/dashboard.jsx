import { Plus, Home, History, Bell, Settings, Send, Receipt, ArrowLeft, Mic, RefreshCw, Globe } from 'lucide-react'
import { useState, useEffect } from 'react'

function Dashboard({ onNavigate, walletAddress, isConnected }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ethSepoliaBalances, setEthSepoliaBalances] = useState({ native: 0, tokens: [] })
  const [baseSepoliaBalances, setBaseSepoliaBalances] = useState({ native: 0, tokens: [] })
  const [ensName, setEnsName] = useState(null)
  const [baseName, setBaseName] = useState(null)
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum')
  
  const address = walletAddress
  
  const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || ''
  
  const networks = {
    ethereum: {
      name: 'Ethereum Sepolia',
      symbol: 'ETH',
      alchemyUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      faucetUrl: 'https://sepoliafaucet.com/',
      ensResolver: 'https://eth-mainnet.g.alchemy.com/v2/', 
      tokens: {
        LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", 
        UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
      }
    },
    base: {
      name: 'Base Sepolia',
      symbol: 'ETH',
      alchemyUrl: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      faucetUrl: 'https://www.alchemy.com/faucets/base-sepolia',
      baseNameResolver: 'https://base-mainnet.g.alchemy.com/v2/', 
      tokens: {
        USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        LINK: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410"
      }
    }
  }

  const resolveDomainNames = async (address) => {
    if (!address) return

    try {
      // Mock ENS and Base names for demo purposes
      const mockEnsNames = {
        '0x1234567890123456789012345678901234567890': 'alice.eth',
        '0x742d35Cc6634C0532925a3b8D6Ac6E29F0da6a44': 'bob.eth'
      }

      const mockBaseNames = {
        '0x1234567890123456789012345678901234567890': 'alice.base.eth',
        '0x742d35Cc6634C0532925a3b8D6Ac6E29F0da6a44': 'bob.base.eth'
      }

      if (mockEnsNames[address]) {
        setEnsName(mockEnsNames[address])
      }

      if (mockBaseNames[address]) {
        setBaseName(mockBaseNames[address])
      }
    } catch (error) {
      console.error('Error resolving domain names:', error)
    }
  }

  const fetchNativeBalance = async (networkKey) => {
    const network = networks[networkKey]
    if (!address || !ALCHEMY_API_KEY || ALCHEMY_API_KEY === '') {
      return 0
    }

    try {
      const response = await fetch(network.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
      })

      const data = await response.json()
      if (data.result) {
        const balanceWei = parseInt(data.result, 16)
        const balanceEth = balanceWei / Math.pow(10, 18)
        return balanceEth
      }
    } catch (error) {
      console.error(`Error fetching ${networkKey} balance:`, error)
    }
    return 0
  }

  const fetchTokenBalances = async (networkKey) => {
    const network = networks[networkKey]
    if (!address || !ALCHEMY_API_KEY || ALCHEMY_API_KEY === 'YOUR_ALCHEMY_API_KEY_HERE') {
      return []
    }
    
    const balances = []
    
    try {
      const response = await fetch(network.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getTokenBalances',
          params: [
            address,
            Object.values(network.tokens)
          ]
        })
      })

      const data = await response.json()
      
      if (data.result && data.result.tokenBalances) {
        for (const tokenBalance of data.result.tokenBalances) {
          if (tokenBalance.tokenBalance && tokenBalance.tokenBalance !== '0x0') {
            try {
              const metadataResponse = await fetch(network.alchemyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 2,
                  method: 'alchemy_getTokenMetadata',
                  params: [tokenBalance.contractAddress]
                })
              })

              const metadata = await metadataResponse.json()
              
              if (metadata.result) {
                const balance = parseInt(tokenBalance.tokenBalance, 16) / Math.pow(10, metadata.result.decimals || 18)
                
                balances.push({
                  symbol: metadata.result.symbol || 'UNKNOWN',
                  balance: balance.toFixed(6),
                  contract: tokenBalance.contractAddress,
                  name: metadata.result.name || 'Unknown Token',
                  network: networkKey
                })
              }
            } catch (metaError) {
              console.error('Error fetching token metadata:', metaError)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ${networkKey} token balances:`, error)
    }
    
    return balances
  }

  const fetchAllBalances = async () => {
    if (!address) return
    
    setLoading(true)
    setError(null)
    
    try {
      const [ethNative, ethTokens] = await Promise.all([
        fetchNativeBalance('ethereum'),
        fetchTokenBalances('ethereum')
      ])
      
      const [baseNative, baseTokens] = await Promise.all([
        fetchNativeBalance('base'),
        fetchTokenBalances('base')
      ])
      
      setEthSepoliaBalances({ native: ethNative, tokens: ethTokens })
      setBaseSepoliaBalances({ native: baseNative, tokens: baseTokens })
      
      await resolveDomainNames(address)
      
    } catch (error) {
      console.error("Error fetching balances:", error)
      setError("Failed to fetch balances: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactionHistory = async () => {
    if (!address || !ALCHEMY_API_KEY || ALCHEMY_API_KEY === '') {
      setError("Alchemy API key required for transaction history")
      return
    }
    
    const network = networks[selectedNetwork]
    
    try {
      const response = await fetch(network.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: address,
            category: ['external', 'token'],
            maxCount: '0xa',
            order: 'desc'
          }]
        })
      })

      const data = await response.json()
      
      if (data.result && data.result.transfers) {
        const processedTxs = data.result.transfers.map(tx => ({
          hash: tx.hash,
          type: 'Sent',
          amount: parseFloat(tx.value || 0).toFixed(4),
          address: tx.to,
          timestamp: new Date().toLocaleDateString(),
          symbol: tx.asset || network.symbol,
          blockNumber: parseInt(tx.blockNum, 16)
        }))
        
        setTransactions(processedTxs.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        // This would be handled by parent component
        console.log('Wallet connected:', accounts[0])
      } catch (error) {
        console.error('Failed to connect wallet:', error)
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet')
    }
  }

  const signMessage = async () => {
    if (!address || typeof window.ethereum === 'undefined') {
      console.error("Wallet not connected")
      return
    }

    try {
      const message = `Sign this message to authenticate with Sepolia testnet`
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      })
      console.log("Signature:", signature)
      alert("Successfully authenticated with wallet signature!")
    } catch (error) {
      console.error("Error signing message:", error)
      alert("Failed to sign message: " + error.message)
    }
  }

  useEffect(() => {
    if (address) {
      fetchAllBalances()
    } else {
      setEthSepoliaBalances({ native: 0, tokens: [] })
      setBaseSepoliaBalances({ native: 0, tokens: [] })
      setEnsName(null)
      setBaseName(null)
    }
  }, [address])

  useEffect(() => {
    if (address) {
      fetchTransactionHistory()
    } else {
      setTransactions([])
    }
  }, [address, selectedNetwork])

  const calculateTotalBalance = () => {
    let total = 0
    total += ethSepoliaBalances.native * 2000
    total += baseSepoliaBalances.native * 2000
    return total.toFixed(2)
  }

  const getDisplayName = (addr) => {
    if (!addr) return ''
    if (ensName && addr.toLowerCase() === address?.toLowerCase()) {
      return ensName
    }
    if (baseName && addr.toLowerCase() === address?.toLowerCase()) {
      return baseName
    }
    return formatAddress(addr)
  }

  const getWelcomeName = () => {
    if (!address) return 'Connect Wallet'
    if (baseName) {
      return baseName.replace('.base.eth', '')
    }
    if (ensName) {
      return ensName.replace('.eth', '')
    }
    return formatAddress(address)
  }

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=50&h=50"
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="text-gray-400 text-sm">Welcome,</p>
              <div className="flex items-center gap-2">
                {baseName && (
                  <Globe className="w-4 h-4 text-blue-400" />
                )}
                <p className="font-semibold text-lg">
                  {getWelcomeName()}
                </p>
              </div>
              {(baseName || ensName) && address && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatAddress(address)}
                </p>
              )}
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="text-right">
            {!isConnected ? (
              <div>
                <button
                  onClick={connectWallet}
                  className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600"
                >
                  Connect Wallet
                </button>
                <p className="text-gray-400 text-xs mt-1">
                  New to wallets?{' '}
                  <a
                    href="https://www.coinbase.com/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-400"
                  >
                    Learn & Create
                  </a>
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {(ensName || baseName) && (
                    <Globe className="w-4 h-4 text-blue-400" />
                  )}
                  <p className="text-green-400 text-sm font-semibold">
                    {getDisplayName(address)}
                  </p>
                </div>
                {(ensName || baseName) && (
                  <p className="text-gray-400 text-xs mb-1">
                    {formatAddress(address)}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    className="bg-green-700 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-green-800"
                    onClick={signMessage}
                  >
                    Authenticate
                  </button>
                  <button
                    className="bg-blue-700 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-800"
                    onClick={fetchAllBalances}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-3 h-3 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Selector */}
        <div className="flex gap-2 mb-6">
          {Object.entries(networks).map(([key, network]) => (
            <button
              key={key}
              onClick={() => setSelectedNetwork(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedNetwork === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {network.name}
            </button>
          ))}
        </div>

        {/* API Key Status & Testnet Info */}
        {(!ALCHEMY_API_KEY || ALCHEMY_API_KEY === 'YOUR_ALCHEMY_API_KEY_HERE') ? (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-300 text-sm mb-2">
               <strong>Setup Required:</strong> Add your Alchemy API key to VITE_ALCHEMY_API_KEY environment variable
            </p>
            <p className="text-yellow-200 text-xs">
              Get your free API key at: <a href="https://alchemy.com" target="_blank" className="underline">alchemy.com</a>
            </p>
          </div>
        ) : (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-6">
            <p className="text-green-300 text-sm flex items-center gap-2">
              ✅ Connected to Sepolia Testnets
              <span className="text-xs bg-green-600 px-2 py-1 rounded">TESTNET</span>
            </p>
            <div className="flex gap-4 mt-2 text-xs text-green-200">
              <a href={networks.ethereum.faucetUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                ETH Sepolia Faucet →
              </a>
              <a href={networks.base.faucetUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                Base Sepolia Faucet →
              </a>
            </div>
          </div>
        )}

        {/* AI Command Input */}
        <button 
          onClick={() => onNavigate && onNavigate('voice_chat')}
          className="w-full bg-white/5 rounded-full p-3 mb-6 flex items-center gap-2 border border-white/10 hover:bg-white/10 transition-all"
        >
          <div className="flex-1 flex items-center gap-2">
            <Mic className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400">Use AI to send money now</span>
          </div>
        </button>

        {/* Balance Card */}
        <div className="bg-[#0F1729] rounded-3xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400">Total Balance - Both Testnets</p>
            <div className="flex items-center gap-1">
              <span>USD</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          {address ? (
            <>
              <p className="text-4xl font-bold mb-4">
                {loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    <span className="text-2xl text-gray-400">$</span>
                    {calculateTotalBalance()}
                    <span className="text-lg text-gray-400 ml-2">(Testnet)</span>
                  </>
                )}
              </p>
              
              {/* Network Balances */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Ethereum Sepolia */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2">Ethereum Sepolia</h4>
                  <div className="text-sm text-gray-300">
                    ETH: {ethSepoliaBalances.native.toFixed(4)}
                  </div>
                  {ethSepoliaBalances.tokens.map((token, idx) => (
                    <div key={idx} className="text-xs text-gray-400">
                      {token.symbol}: {token.balance}
                    </div>
                  ))}
                  {ethSepoliaBalances.tokens.length === 0 && ethSepoliaBalances.native === 0 && (
                    <div className="text-xs text-gray-500">No tokens found</div>
                  )}
                </div>

                {/* Base Sepolia */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2">Base Sepolia</h4>
                  <div className="text-sm text-gray-300">
                    ETH: {baseSepoliaBalances.native.toFixed(4)}
                  </div>
                  {baseSepoliaBalances.tokens.map((token, idx) => (
                    <div key={idx} className="text-xs text-gray-400">
                      {token.symbol}: {token.balance}
                    </div>
                  ))}
                  {baseSepoliaBalances.tokens.length === 0 && baseSepoliaBalances.native === 0 && (
                    <div className="text-xs text-gray-500">No tokens found</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-4xl font-bold mb-4">Connect Wallet</p>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Testnets: ETH Sepolia + Base Sepolia</span>
            {error && (
              <span className="ml-auto text-red-400 text-xs">{error}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4 bg-gradient-to-r from-[#0F1729] to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-full mb-6">
          <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-full transition-all" onClick={() => onNavigate && onNavigate('receive')}>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm">Receive</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-full transition-all" onClick={() => onNavigate && onNavigate('send')}>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm">Send</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-full transition-all" onClick={() => onNavigate && onNavigate('convert')}>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm">Convert</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="mb-20 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Recent Transactions - {networks[selectedNetwork].name}</h3>
            <button 
              className="text-sm text-gray-400 hover:text-white"
              onClick={fetchTransactionHistory}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {!address ? (
            <p className="text-gray-500 text-center py-8">Connect wallet to view transactions</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions found on {networks[selectedNetwork].name}
              <br />
              <span className="text-xs">Get test ETH from faucets above to start testing!</span>
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between hover:bg-white/5 p-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                      ${transaction.type === 'Sent' ? 'bg-red-500' : 'bg-green-500'}`}>
                      {transaction.type === 'Sent' ? 'S' : 'R'}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.type}</p>
                      <p className="text-sm text-gray-400">
                        {transaction.type === 'Sent' ? 'To' : 'From'} {getDisplayName(transaction.address)}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === 'Sent' ? 'text-red-400' : 'text-green-400'}`}>
                      {transaction.type === 'Sent' ? '-' : '+'}{transaction.amount} {transaction.symbol}
                    </p>
                    <p className="text-xs text-gray-500">Block #{transaction.blockNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0F1729] p-4">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <button className="flex flex-col items-center gap-1">
              <Home className="w-6 h-6" />
              <span className="text-xs">Home</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <History className="w-6 h-6" />
              <span className="text-xs">History</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Bell className="w-6 h-6" />
              <span className="text-xs">Notification</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Settings className="w-6 h-6" />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard