import axios from "axios"

const SUPRA_API_URL = "https://prod-api.cerberus.supra.com/graphql"

interface CatalogTradingPairInput {
  instrumentTypeId: string
  instrumentId: string
  doraType: string
  instrumentPairDisplayName: string
  createdAtStart: string
  createdAtEnd: string
  interval: number
  providerId: string
  forceUpdate?: boolean
}

interface PriceGraphData {
  average: string
  median: string
  high: string
  low: string
  timestamp: string
  __typename: string
}

export interface CatalogTradingPairPricesGraph {
  catalogTradingPairPricesGraph: PriceGraphData[]
}

export interface PriceUpdate {
  timestamp: string
  average: string
  median: string
  high: string
  low: string
  catalogInfo: {
    pair: string
    index: string
    provider: string
  }
}

export interface Asset {
  name: string
  deposits: string
  borrows: string
  ltv: string
  bw: string
  depositApr: string
  borrowApr: string
  price: string
  priceChange: number
  dataPair: string
  status: string
}

async function getCatalogTradingPairPrices(input: CatalogTradingPairInput): Promise<CatalogTradingPairPricesGraph> {
  const query = `
    query GetCatalogTradingPairPricesGraph($input: CatalogTradingPairPricesAndGraphInput) {
      catalogTradingPairPricesGraph(input: $input) {
        average
        median
        high
        low
        timestamp
        __typename
      }
    }
  `

  const response = await makeSupraRequest([
    {
      operationName: "GetCatalogTradingPairPricesGraph",
      query,
      variables: { input },
    },
  ])

  return response[0].data
}

async function pollSupraPrice(
  onPriceUpdate: (price: PriceUpdate) => void,
  intervalMs = 8000,
): Promise<() => void> {
  let isRunning = true

  const poll = async () => {
    while (isRunning) {
      try {
        const now = new Date()
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const input: CatalogTradingPairInput = {
          instrumentTypeId: "1",
          instrumentId: "1009",
          doraType: "2",
          instrumentPairDisplayName: "SUPRA/USDT",
          createdAtStart: oneMonthAgo.toISOString(),
          createdAtEnd: now.toISOString(),
          interval: 7200,
          providerId: "20",
          forceUpdate: false,
        }

        const response = await getCatalogTradingPairPrices(input)

        if (response.catalogTradingPairPricesGraph.length > 0) {
          const latestPrice = response.catalogTradingPairPricesGraph[0]
          onPriceUpdate({
            timestamp: latestPrice.timestamp,
            average: latestPrice.average,
            median: latestPrice.median,
            high: latestPrice.high,
            low: latestPrice.low,
            catalogInfo: {
              pair: "SUPRA/USDT",
              index: "1009",
              provider: "Supra Premium",
            },
          })
        } else {
          console.log("No price data received")
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      } catch (error) {
        console.error("Error polling price:", error)
        await new Promise((resolve) => setTimeout(resolve, intervalMs)) // Wait before retrying
      }
    }
  }

  // Start polling
  poll()

  // Return function to stop polling
  return () => {
    isRunning = false
  }
}

async function makeSupraRequest(
  operations: Array<{
    query: string
    variables?: any
    operationName?: string
  }>,
) {
  try {
    const response = await axios.post(SUPRA_API_URL, operations)
    if (response.data[0].errors) {
      throw new Error("GraphQL request failed")
    }
    return response.data
  } catch (error) {
    console.error("Error fetching data:", error)
    if (axios.isAxiosError(error)) {
    }
    throw error
  }
}

async function fetchAssetData(): Promise<Asset[]> {
  // Consolidate SUPRA assets with consistent naming
  const assets = [
    { name: "SUP", instrumentId: "1009", pair: "SUPRA/USDT", displayName: "SUP" },
    { name: "ETH", instrumentId: "1", pair: "ETH/USDT", displayName: "ETH" },
    { name: "HUSDC", instrumentId: "2", pair: "USDC/USDT", displayName: "HUSDC" }, 
  ]

  const assetData = await Promise.all(
    assets.map(async (asset) => {
      const input: CatalogTradingPairInput = {
        instrumentTypeId: "1",
        instrumentId: asset.instrumentId,
        doraType: "2",
        instrumentPairDisplayName: asset.pair,
        createdAtStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        createdAtEnd: new Date().toISOString(),
        interval: 60,
        providerId: "20",
        forceUpdate: true,
      }

      try {
        const response = await getCatalogTradingPairPrices(input)
        const prices = response.catalogTradingPairPricesGraph;
        
        // Ensure we have price data
        if (!prices || prices.length === 0) {
          throw new Error('No price data available');
        }

        // Get the latest and previous prices
        const latestPrice = prices.reduce((latest, current) => {
          return !latest || new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
        }, prices[0]);

        const previousPrice = prices.reduce((prev, current) => {
          const currentTime = new Date(current.timestamp);
          const latestTime = new Date(latestPrice.timestamp);
          return currentTime < latestTime && (!prev || currentTime > new Date(prev.timestamp)) ? current : prev;
        }, null);

        const priceChange = previousPrice ? 
          ((Number(latestPrice.average) - Number(previousPrice.average)) / Number(previousPrice.average)) * 100 
          : 0;

        // Create base asset data with actual price
        const baseAsset = {
          deposits: "0",
          borrows: "0",
          ltv: "80", // Default LTV
          bw: "90", // Default BW
          depositApr: "5", // Default deposit APR
          borrowApr: "8", // Default borrow APR
          price: latestPrice.average,
          priceChange: Number(priceChange.toFixed(2)),
          dataPair: asset.pair,
          status: "active"
        }

        // For SUPRA, create multiple variants with same price data
        if (asset.name === "SUP") {
          return [
            { ...baseAsset, name: "SUP" },
            { ...baseAsset, name: "WSUP" }
          ]
        }

        // For other assets, return single asset
        return [{
          ...baseAsset,
          name: asset.name === "HUSDC" ? "HUSDC" : asset.displayName, 
          price: asset.name === "HUSDC" ? "1.00" : baseAsset.price, 
          priceChange: asset.name === "HUSDC" ? 0 : baseAsset.priceChange 
        }]
      } catch (error) {
        console.error(`Error fetching data for ${asset.name}:`, error)
        // Retry once before using default values
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryResponse = await getCatalogTradingPairPrices(input);
          const prices = retryResponse.catalogTradingPairPricesGraph;
          
          if (prices && prices.length > 0) {
            const latestPrice = prices[0];
            const baseAsset = {
              deposits: "0",
              borrows: "0",
              ltv: "80",
              bw: "90",
              depositApr: "5",
              borrowApr: "8",
              price: latestPrice.average,
              priceChange: 0,
              dataPair: asset.pair,
              status: "active"
            }

            if (asset.name === "SUP") {
              return [
                { ...baseAsset, name: "SUP" },
                { ...baseAsset, name: "WSUP" }
              ]
            }

            return [{
              ...baseAsset,
              name: asset.name === "HUSDC" ? "HUSDC" : asset.displayName, 
              price: asset.name === "HUSDC" ? "1.00" : baseAsset.price, 
              priceChange: asset.name === "HUSDC" ? 0 : baseAsset.priceChange 
            }]
          }
        } catch (retryError) {
          console.error(`Retry failed for ${asset.name}:`, retryError);
        }

        // Use default values as last resort
        const defaultAsset = {
          deposits: "0",
          borrows: "0",
          ltv: "80",
          bw: "90",
          depositApr: "5",
          borrowApr: "8",
          price: "0",
          priceChange: 0,
          dataPair: asset.pair,
          status: "error"
        }

        if (asset.name === "SUP") {
          return [
            { ...defaultAsset, name: "SUP" },
            { ...defaultAsset, name: "WSUP" }
          ]
        }

        return [{
          ...defaultAsset,
          name: asset.name === "HUSDC" ? "HUSDC" : asset.displayName, 
          price: asset.name === "HUSDC" ? "1.00" : defaultAsset.price, 
          priceChange: asset.name === "HUSDC" ? 0 : defaultAsset.priceChange 
        }]
      }
    })
  )

  // Flatten the array since we're now returning arrays from the map
  return assetData.flat()
}

export {
  getCatalogTradingPairPrices,
  pollSupraPrice,
  fetchAssetData,
  type CatalogTradingPairInput,
  type PriceGraphData
}
