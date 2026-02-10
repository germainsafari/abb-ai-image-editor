import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl } = await request.json()

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 })
    }

    const apiUser = process.env.SIGHTENGINE_API_USER
    const apiSecret = process.env.SIGHTENGINE_API_KEY

    if (!apiUser || !apiSecret) {
      console.error("SIGHTENGINE_API_USER or SIGHTENGINE_API_KEY is not configured")
      // Return default values if API is not configured (fallback behavior)
      return NextResponse.json(
        {
          isAIGenerated: false,
          probability: 3,
        },
        { status: 200 },
      )
    }

    // Expect a data URL, extract the base64 content
    const base64Data = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl
    const imageBuffer = Buffer.from(base64Data, "base64")

    // Create form data for SightEngine API
    // Use FormData which is available in Node.js 18+
    const formData = new FormData()
    
    // Create a Blob from the buffer
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append("media", imageBlob, "image.jpg")
    formData.append("models", "genai")
    formData.append("api_user", apiUser)
    formData.append("api_secret", apiSecret)

    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error from SightEngine")
      console.error("SightEngine error:", response.status, errorText)
      // Return default values on error (fallback behavior)
      return NextResponse.json(
        {
          isAIGenerated: false,
          probability: 3,
        },
        { status: 200 },
      )
    }

    const data = await response.json()

    console.log("SightEngine response:", JSON.stringify(data, null, 2))

    // Extract AI generation probability from SightEngine response
    // SightEngine returns the score under data.type.ai_generated (a float between 0 and 1)
    const aiGeneratedScore = data.type?.ai_generated ?? 0
    const probability = Math.round(aiGeneratedScore * 100) // Convert to percentage
    const isAIGenerated = probability >= 50 // Threshold: 50% or higher is "likely"

    console.log(`AI detection result: score=${aiGeneratedScore}, probability=${probability}%, isAIGenerated=${isAIGenerated}`)

    return NextResponse.json({
      isAIGenerated,
      probability,
    })
  } catch (error) {
    console.error("detect-ai route error:", error)
    // Return default values on error (fallback behavior)
    return NextResponse.json(
      {
        isAIGenerated: false,
        probability: 3,
      },
      { status: 200 },
    )
  }
}

