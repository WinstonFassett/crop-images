import React, { useState, useRef, useEffect, useCallback } from "react"
import { useFireproof } from "use-fireproof"
import { callAI } from "call-ai"
import { ImgGen } from "use-vibes"
import "./index.css"

export default function ImageCropperPro() {
  const { useDocument, useLiveQuery, database } = useFireproof("image-cropper")
  
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [activeTab, setActiveTab] = useState({}) // imageIndex -> 'crop' | 'result'
  const [minWidth, setMinWidth] = useState(100)
  const [maxWidth, setMaxWidth] = useState(2000)
  const [minHeight, setMinHeight] = useState(100)
  const [maxHeight, setMaxHeight] = useState(2000)
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false)
  const [customAspectRatio, setCustomAspectRatio] = useState("1:1")
  const [customNumerator, setCustomNumerator] = useState(1)
  const [customDenominator, setCustomDenominator] = useState(1)
  const [isCustomRatio, setIsCustomRatio] = useState(false)
  const [targetWidth, setTargetWidth] = useState("")
  const [targetHeight, setTargetHeight] = useState("")
  const [useTargetDimensions, setUseTargetDimensions] = useState(false)
  const [cropperInstances, setCropperInstances] = useState({})
  const [croppedImages, setCroppedImages] = useState({})
  const [selectedProfile, setSelectedProfile] = useState("")
  const [processingQueue, setProcessingQueue] = useState(new Set())
  const [imageProfiles, setImageProfiles] = useState({}) // imageIndex -> profileId
  const [showPromptDialog, setShowPromptDialog] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [isGeneratingProfiles, setIsGeneratingProfiles] = useState(false)
  const [imageNames, setImageNames] = useState({}) // imageIndex -> custom name
  const [editingName, setEditingName] = useState(null)
  const [originalDimensions, setOriginalDimensions] = useState({}) // imageIndex -> {width, height}
  const [cropperStates, setCropperStates] = useState({}) // imageIndex -> saved crop state
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [editingProfileName, setEditingProfileName] = useState("")
  
  const imageRefs = useRef({})
  const debounceTimeouts = useRef({})
  
  const { doc, merge, save } = useDocument({
    type: "crop-profile",
    name: "",
    settings: {
      minWidth: 100,
      maxWidth: 2000,
      minHeight: 100,
      maxHeight: 2000,
      aspectRatio: "1:1",
      locked: false,
      customNumerator: 1,
      customDenominator: 1,
      isCustomRatio: false,
      targetWidth: "",
      targetHeight: "",
      useTargetDimensions: false
    }
  })

  const { docs: cropProfiles } = useLiveQuery("type", { 
    key: "crop-profile", 
    descending: true 
  })

  // Load cropperjs dynamically
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/cropperjs@1.6.2/dist/cropper.min.js'
    script.onload = () => {
      console.log('Cropper.js loaded')
    }
    document.head.appendChild(script)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/cropperjs@1.6.2/dist/cropper.min.css'
    document.head.appendChild(link)

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
      if (document.head.contains(link)) document.head.removeChild(link)
    }
  }, [])

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
    const newFiles = files.map((file, index) => ({
      file,
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      name: file.name
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // Set initial tabs to crop view and load original dimensions
    const newTabs = {}
    const newImageProfiles = {}
    const newImageNames = {}
    newFiles.forEach((fileData, index) => {
      const imageIndex = uploadedFiles.length + index
      newTabs[imageIndex] = 'crop'
      newImageProfiles[imageIndex] = 'default' // inherit from settings
      newImageNames[imageIndex] = fileData.name.substring(0, fileData.name.lastIndexOf('.')) || fileData.name
      
      // Load original dimensions
      const img = new Image()
      img.onload = () => {
        setOriginalDimensions(prev => ({
          ...prev,
          [imageIndex]: { width: img.width, height: img.height }
        }))
      }
      img.src = fileData.url
    })
    setActiveTab(prev => ({ ...prev, ...newTabs }))
    setImageProfiles(prev => ({ ...prev, ...newImageProfiles }))
    setImageNames(prev => ({ ...prev, ...newImageNames }))
  }

  const removeImage = (indexToRemove) => {
    // Clean up URL
    URL.revokeObjectURL(uploadedFiles[indexToRemove].url)
    
    // Destroy cropper if exists
    if (cropperInstances[indexToRemove]) {
      cropperInstances[indexToRemove].destroy()
    }
    
    // Clean up cropped image URL
    if (croppedImages[indexToRemove]?.url) {
      URL.revokeObjectURL(croppedImages[indexToRemove].url)
    }
    
    // Remove from all state
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove))
    
    // Reindex remaining items
    const newActiveTab = {}
    const newImageProfiles = {}
    const newCropperInstances = {}
    const newCroppedImages = {}
    const newImageNames = {}
    const newOriginalDimensions = {}
    const newCropperStates = {}
    
    uploadedFiles.forEach((_, oldIndex) => {
      if (oldIndex < indexToRemove) {
        // Keep same index
        if (activeTab[oldIndex]) newActiveTab[oldIndex] = activeTab[oldIndex]
        if (imageProfiles[oldIndex]) newImageProfiles[oldIndex] = imageProfiles[oldIndex]
        if (cropperInstances[oldIndex]) newCropperInstances[oldIndex] = cropperInstances[oldIndex]
        if (croppedImages[oldIndex]) newCroppedImages[oldIndex] = croppedImages[oldIndex]
        if (imageNames[oldIndex]) newImageNames[oldIndex] = imageNames[oldIndex]
        if (originalDimensions[oldIndex]) newOriginalDimensions[oldIndex] = originalDimensions[oldIndex]
        if (cropperStates[oldIndex]) newCropperStates[oldIndex] = cropperStates[oldIndex]
      } else if (oldIndex > indexToRemove) {
        // Shift index down by 1
        const newIndex = oldIndex - 1
        if (activeTab[oldIndex]) newActiveTab[newIndex] = activeTab[oldIndex]
        if (imageProfiles[oldIndex]) newImageProfiles[newIndex] = imageProfiles[oldIndex]
        if (cropperInstances[oldIndex]) newCropperInstances[newIndex] = cropperInstances[oldIndex]
        if (croppedImages[oldIndex]) newCroppedImages[newIndex] = croppedImages[oldIndex]
        if (imageNames[oldIndex]) newImageNames[newIndex] = imageNames[oldIndex]
        if (originalDimensions[oldIndex]) newOriginalDimensions[newIndex] = originalDimensions[oldIndex]
        if (cropperStates[oldIndex]) newCropperStates[newIndex] = cropperStates[oldIndex]
      }
      // Skip indexToRemove (effectively removing it)
    })
    
    setActiveTab(newActiveTab)
    setImageProfiles(newImageProfiles)
    setCropperInstances(newCropperInstances)
    setCroppedImages(newCroppedImages)
    setImageNames(newImageNames)
    setOriginalDimensions(newOriginalDimensions)
    setCropperStates(newCropperStates)
  }

  const getSettingsForImage = (imageIndex) => {
    const profileId = imageProfiles[imageIndex]
    if (profileId === 'default') {
      // Use current global settings
      return {
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        aspectRatio: customAspectRatio,
        locked: aspectRatioLocked,
        customNumerator,
        customDenominator,
        isCustomRatio,
        targetWidth,
        targetHeight,
        useTargetDimensions
      }
    } else {
      // Use selected profile
      const profile = cropProfiles.find(p => p._id === profileId)
      return profile ? profile.settings : {
        minWidth: 100,
        maxWidth: 2000,
        minHeight: 100,
        maxHeight: 2000,
        aspectRatio: "1:1",
        locked: false,
        customNumerator: 1,
        customDenominator: 1,
        isCustomRatio: false,
        targetWidth: "",
        targetHeight: "",
        useTargetDimensions: false
      }
    }
  }

  const getCurrentAspectRatio = (imageIndex) => {
    const settings = getSettingsForImage(imageIndex)
    if (!settings.locked) return NaN
    
    if (settings.useTargetDimensions && settings.targetWidth && settings.targetHeight) {
      return Number(settings.targetWidth) / Number(settings.targetHeight)
    }
    
    if (settings.isCustomRatio) {
      return settings.customNumerator / settings.customDenominator
    }
    
    const [width, height] = settings.aspectRatio.split(':').map(Number)
    return width / height
  }

  const getAspectRatioString = (imageIndex) => {
    const settings = getSettingsForImage(imageIndex)
    if (!settings.locked) return null
    
    if (settings.useTargetDimensions && settings.targetWidth && settings.targetHeight) {
      return `${settings.targetWidth}:${settings.targetHeight}`
    }
    
    if (settings.isCustomRatio) {
      return `${settings.customNumerator}:${settings.customDenominator}`
    }
    
    return settings.aspectRatio
  }

  // Invalidate cropped image
  const invalidateCrop = useCallback((imageIndex) => {
    console.log(`Invalidating crop for image ${imageIndex}`)
    
    // Clear existing cropped image
    if (croppedImages[imageIndex]?.url) {
      URL.revokeObjectURL(croppedImages[imageIndex].url)
    }
    
    setCroppedImages(prev => {
      const newImages = { ...prev }
      delete newImages[imageIndex]
      return newImages
    })
  }, [croppedImages])

  // Debounced invalidation for manual crop changes
  const debouncedInvalidate = useCallback((imageIndex) => {
    if (debounceTimeouts.current[imageIndex]) {
      clearTimeout(debounceTimeouts.current[imageIndex])
    }
    
    debounceTimeouts.current[imageIndex] = setTimeout(() => {
      invalidateCrop(imageIndex)
    }, 500) // 500ms debounce
  }, [invalidateCrop])

  // Save cropper state when switching away from crop tab
  const saveCropperState = (imageIndex) => {
    const cropper = cropperInstances[imageIndex]
    if (cropper) {
      const cropBoxData = cropper.getCropBoxData()
      const imageData = cropper.getImageData()
      const canvasData = cropper.getCanvasData()
      
      setCropperStates(prev => ({
        ...prev,
        [imageIndex]: {
          cropBoxData,
          imageData,
          canvasData
        }
      }))
      console.log(`Saved cropper state for image ${imageIndex}`)
    }
  }

  // Restore cropper state when returning to crop tab
  const restoreCropperState = (imageIndex, cropper) => {
    const savedState = cropperStates[imageIndex]
    if (savedState) {
      console.log(`Restoring cropper state for image ${imageIndex}`)
      try {
        cropper.setCanvasData(savedState.canvasData)
        cropper.setCropBoxData(savedState.cropBoxData)
      } catch (error) {
        console.log('Could not restore cropper state:', error)
      }
    }
  }

  const destroyAndRecreateCropper = (imageIndex) => {
    console.log(`Destroying and recreating cropper for image ${imageIndex}`)
    
    // Destroy existing cropper completely
    if (cropperInstances[imageIndex]) {
      cropperInstances[imageIndex].destroy()
      setCropperInstances(prev => {
        const newInstances = { ...prev }
        delete newInstances[imageIndex]
        return newInstances
      })
    }
    
    // Force recreate after a delay
    setTimeout(() => {
      initializeCropper(imageIndex)
    }, 150)
  }

  const initializeCropper = (imageIndex) => {
    const imageRef = imageRefs.current[imageIndex]
    if (imageRef && window.Cropper && uploadedFiles[imageIndex]) {
      console.log(`Initializing cropper for image ${imageIndex}`)
      
      // Make sure no existing cropper
      if (cropperInstances[imageIndex]) {
        cropperInstances[imageIndex].destroy()
      }

      const settings = getSettingsForImage(imageIndex)
      const aspectRatio = getCurrentAspectRatio(imageIndex)
      
      const cropper = new window.Cropper(imageRef, {
        aspectRatio: aspectRatio,
        viewMode: 1,
        dragMode: 'crop',
        autoCropArea: 0.65,
        responsive: true,
        restore: false,
        checkOrientation: false,
        scalable: true,
        zoomable: true,
        rotatable: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        minCropBoxWidth: Math.max(10, settings.minWidth),
        minCropBoxHeight: Math.max(10, settings.minHeight),
        ready() {
          console.log(`Cropper ready for image ${imageIndex}`)
          
          // Restore saved state if available, with delay
          setTimeout(() => {
            restoreCropperState(imageIndex, this.cropper)
          }, 100)
          
          // Apply dimension constraints after restoration
          setTimeout(() => {
            const cropBoxData = this.cropper.getCropBoxData()
            const constrainedWidth = Math.max(settings.minWidth, Math.min(settings.maxWidth, cropBoxData.width))
            const constrainedHeight = Math.max(settings.minHeight, Math.min(settings.maxHeight, cropBoxData.height))
            
            this.cropper.setCropBoxData({
              ...cropBoxData,
              width: constrainedWidth,
              height: constrainedHeight
            })
          }, 200)
        },
        cropend() {
          // Auto-apply constraints on crop end
          const cropBoxData = this.cropper.getCropBoxData()
          const constrainedWidth = Math.max(settings.minWidth, Math.min(settings.maxWidth, cropBoxData.width))
          const constrainedHeight = Math.max(settings.minHeight, Math.min(settings.maxHeight, cropBoxData.height))
          
          if (Math.abs(constrainedWidth - cropBoxData.width) > 1 || Math.abs(constrainedHeight - cropBoxData.height) > 1) {
            this.cropper.setCropBoxData({
              ...cropBoxData,
              width: constrainedWidth,
              height: constrainedHeight
            })
          }
          
          // Save state and debounced invalidation
          saveCropperState(imageIndex)
          debouncedInvalidate(imageIndex)
        },
        crop() {
          // Save state on crop changes
          saveCropperState(imageIndex)
          debouncedInvalidate(imageIndex)
        }
      })
      
      setCropperInstances(prev => ({ ...prev, [imageIndex]: cropper }))
    }
  }

  // Initialize croppers only when needed
  useEffect(() => {
    const timeouts = []
    
    uploadedFiles.forEach((_, index) => {
      if (activeTab[index] === 'crop' && !cropperInstances[index]) {
        const timeout = setTimeout(() => initializeCropper(index), 200)
        timeouts.push(timeout)
      }
    })

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [uploadedFiles, activeTab])

  // Invalidate crops when settings change for images using default profile
  useEffect(() => {
    uploadedFiles.forEach((_, index) => {
      if (imageProfiles[index] === 'default') {
        invalidateCrop(index)
        
        // Force destroy and recreate cropper if on crop tab
        if (activeTab[index] === 'crop') {
          destroyAndRecreateCropper(index)
        }
      }
    })
  }, [aspectRatioLocked, customAspectRatio, isCustomRatio, customNumerator, customDenominator, useTargetDimensions, targetWidth, targetHeight, minWidth, maxWidth, minHeight, maxHeight])

  const cropImage = async (imageIndex, force = false) => {
    if (!cropperInstances[imageIndex]) return null
    
    // Don't recrop unless forced or no existing crop
    if (!force && croppedImages[imageIndex]) return croppedImages[imageIndex]
    
    setProcessingQueue(prev => new Set([...prev, imageIndex]))
    
    const cropper = cropperInstances[imageIndex]
    const settings = getSettingsForImage(imageIndex)
    
    const canvas = cropper.getCroppedCanvas({
      minWidth: settings.minWidth,
      maxWidth: settings.maxWidth,
      minHeight: settings.minHeight,
      maxHeight: settings.maxHeight,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      maxWidth: 4096,
      maxHeight: 4096
    })
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const dimensions = {
          width: canvas.width,
          height: canvas.height
        }
        
        const cropData = { url, blob, dimensions }
        
        setCroppedImages(prev => ({ 
          ...prev, 
          [imageIndex]: cropData
        }))
        
        setProcessingQueue(prev => {
          const newSet = new Set(prev)
          newSet.delete(imageIndex)
          return newSet
        })
        
        resolve(cropData)
      }, 'image/png', 0.95)
    })
  }

  const downloadImage = async (imageIndex) => {
    console.log(`Download image ${imageIndex}`)
    let croppedImage = croppedImages[imageIndex]
    
    // If no cropped image, create one first
    if (!croppedImage && cropperInstances[imageIndex]) {
      console.log(`No cropped image, creating one...`)
      croppedImage = await cropImage(imageIndex, true)
    }
    
    if (croppedImage) {
      console.log(`Downloading image ${imageIndex}`)
      const link = document.createElement('a')
      const customName = imageNames[imageIndex] || uploadedFiles[imageIndex].name.substring(0, uploadedFiles[imageIndex].name.lastIndexOf('.'))
      link.download = `${customName}-cropped.png`
      link.href = croppedImage.url
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      console.log(`No cropped image available for ${imageIndex}`)
    }
  }

  const downloadAllCroppedImages = async () => {
    console.log('Starting download all...', uploadedFiles.length, 'images')
    
    // First ensure all images are cropped
    for (let i = 0; i < uploadedFiles.length; i++) {
      if (!croppedImages[i]) {
        if (cropperInstances[i]) {
          console.log(`Cropping image ${i}...`)
          await cropImage(i, true)
        } else {
          console.log(`No cropper for image ${i}, need to initialize`)
          continue
        }
      }
    }
    
    // Then download all with staggered timing to prevent browser blocking
    for (let i = 0; i < uploadedFiles.length; i++) {
      setTimeout(async () => {
        await downloadImage(i)
      }, i * 200) // 200ms between downloads
    }
  }

  const cropAllImages = async () => {
    console.log('Cropping all images...')
    
    // Switch all tabs to result view and force crop
    const newTabs = {}
    for (let i = 0; i < uploadedFiles.length; i++) {
      newTabs[i] = 'result'
      if (cropperInstances[i]) {
        await cropImage(i, true) // Force recrop
      }
    }
    setActiveTab(newTabs)
  }

  const saveProfileFromCurrentSettings = async (nameOverride = "") => {
    const profileName = nameOverride || (selectedProfile ? 
      cropProfiles.find(p => p._id === selectedProfile)?.name : "")
    
    if (!profileName?.trim()) return
    
    const profileData = {
      type: "crop-profile",
      name: profileName.trim(),
      settings: {
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        aspectRatio: customAspectRatio,
        locked: aspectRatioLocked,
        customNumerator,
        customDenominator,
        isCustomRatio,
        targetWidth,
        targetHeight,
        useTargetDimensions
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    if (selectedProfile) {
      // Update existing profile
      await database.put({ ...profileData, _id: selectedProfile })
    } else {
      // Create new profile
      const result = await database.put(profileData)
      setSelectedProfile(result.id)
    }
  }

  const createProfile = async (name) => {
    const profileData = {
      type: "crop-profile",
      name: name.trim(),
      settings: {
        minWidth: 100,
        maxWidth: 2000,
        minHeight: 100,
        maxHeight: 2000,
        aspectRatio: "1:1",
        locked: false,
        customNumerator: 1,
        customDenominator: 1,
        isCustomRatio: false,
        targetWidth: "",
        targetHeight: "",
        useTargetDimensions: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await database.put(profileData)
  }

  const deleteProfile = async (profileId) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      await database.del(profileId)
      
      // Reset any images using this profile to default
      const newImageProfiles = { ...imageProfiles }
      Object.keys(newImageProfiles).forEach(imageIndex => {
        if (newImageProfiles[imageIndex] === profileId) {
          newImageProfiles[imageIndex] = 'default'
        }
      })
      setImageProfiles(newImageProfiles)
      
      // Clear selected profile if it was deleted
      if (selectedProfile === profileId) {
        setSelectedProfile("")
      }
    }
  }

  const renameProfile = async (profileId, newName) => {
    const profile = cropProfiles.find(p => p._id === profileId)
    if (profile) {
      await database.put({
        ...profile,
        name: newName.trim(),
        updatedAt: Date.now()
      })
    }
  }

  const clearAllProfiles = async () => {
    if (confirm('Are you sure you want to delete ALL profiles? This cannot be undone.')) {
      for (const profile of cropProfiles) {
        await database.del(profile._id)
      }
      setSelectedProfile("")
      // Reset all images to default
      const newImageProfiles = {}
      Object.keys(imageProfiles).forEach(imageIndex => {
        newImageProfiles[imageIndex] = 'default'
      })
      setImageProfiles(newImageProfiles)
    }
  }

  const applyProfile = (profile) => {
    const settings = profile.settings
    setMinWidth(settings.minWidth || 100)
    setMaxWidth(settings.maxWidth || 2000)
    setMinHeight(settings.minHeight || 100)
    setMaxHeight(settings.maxHeight || 2000)
    setCustomAspectRatio(settings.aspectRatio || "1:1")
    setAspectRatioLocked(settings.locked || false)
    setCustomNumerator(settings.customNumerator || 1)
    setCustomDenominator(settings.customDenominator || 1)
    setIsCustomRatio(settings.isCustomRatio || false)
    setTargetWidth(settings.targetWidth || "")
    setTargetHeight(settings.targetHeight || "")
    setUseTargetDimensions(settings.useTargetDimensions || false)
  }

  const showGenerateDialog = () => {
    const defaultPrompt = "Generate 5 diverse image cropping profiles for different use cases like social media posts, profile pictures, web thumbnails, print materials, and mobile app icons. Include specific dimensions, aspect ratios, and appropriate constraints for each use case."
    setCurrentPrompt(defaultPrompt)
    setShowPromptDialog(true)
  }

  const generateProfiles = async () => {
    setShowPromptDialog(false)
    
    const generator = await callAI(currentPrompt, {
      stream: true,
      schema: {
        properties: {
          profiles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                aspectRatio: { type: "string" },
                minWidth: { type: "number" },
                maxWidth: { type: "number" },
                minHeight: { type: "number" },
                maxHeight: { type: "number" },
                locked: { type: "boolean" },
                description: { type: "string" }
              }
            }
          }
        }
      }
    })

    let finalResponse = ""
    for await (const chunk of generator) {
      finalResponse = chunk
    }

    try {
      const data = JSON.parse(finalResponse)
      for (const profile of data.profiles) {
        await database.put({
          type: "crop-profile",
          name: profile.name,
          settings: {
            aspectRatio: profile.aspectRatio,
            minWidth: profile.minWidth,
            maxWidth: profile.maxWidth,
            minHeight: profile.minHeight,
            maxHeight: profile.maxHeight,
            locked: profile.locked,
            customNumerator: 1,
            customDenominator: 1,
            isCustomRatio: false,
            targetWidth: "",
            targetHeight: "",
            useTargetDimensions: false
          },
          description: profile.description,
          createdAt: Date.now()
        })
      }
    } catch (error) {
      console.error("Error parsing profile data:", error)
    }
  }

  const handleTabChange = async (imageIndex, tab) => {
    console.log(`Switching from ${activeTab[imageIndex]} to ${tab} for image ${imageIndex}`)
    
    // Save cropper state when leaving crop tab
    if (activeTab[imageIndex] === 'crop' && tab !== 'crop') {
      saveCropperState(imageIndex)
    }
    
    setActiveTab(prev => ({ ...prev, [imageIndex]: tab }))
    
    if (tab === 'result') {
      // Check if we need to crop
      if (!croppedImages[imageIndex] && cropperInstances[imageIndex]) {
        await cropImage(imageIndex, true)
      }
    } else if (tab === 'crop') {
      // Force destroy and recreate cropper to ensure frame shows
      setTimeout(() => destroyAndRecreateCropper(imageIndex), 50)
    }
  }

  const handleProfileChange = (imageIndex, profileId) => {
    setImageProfiles(prev => ({ ...prev, [imageIndex]: profileId }))
    
    // Invalidate existing crop
    invalidateCrop(imageIndex)
    
    // Clear saved cropper state since profile changed
    setCropperStates(prev => {
      const newStates = { ...prev }
      delete newStates[imageIndex]
      return newStates
    })
    
    // Force destroy and recreate cropper with new settings
    if (activeTab[imageIndex] === 'crop') {
      destroyAndRecreateCropper(imageIndex)
    }
  }

  const handleNameEdit = (imageIndex, newName) => {
    setImageNames(prev => ({ ...prev, [imageIndex]: newName }))
  }

  const getSizeDelta = (imageIndex) => {
    const original = originalDimensions[imageIndex]
    const cropped = croppedImages[imageIndex]
    
    if (!original || !cropped) return null
    
    const originalSize = original.width * original.height
    const croppedSize = cropped.dimensions.width * cropped.dimensions.height
    const percent = Math.round((croppedSize / originalSize) * 100)
    
    return `${percent}% of original`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#70d6ff] via-[#ffffff] to-[#e9ff70]">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, #ff70a6 2px, transparent 2px),
                           radial-gradient(circle at 80% 20%, #ff9770 2px, transparent 2px),
                           radial-gradient(circle at 40% 40%, #ffd670 2px, transparent 2px)`,
          backgroundSize: '60px 60px, 80px 80px, 100px 100px'
        }}></div>
      </div>

      {/* Profile Management Dialog */}
      {showProfileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#ffffff] border-4 border-[#242424] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#242424]">📋 Manage Profiles</h2>
              <button
                onClick={() => setShowProfileDialog(false)}
                className="px-3 py-1 border-2 border-[#242424] rounded font-bold bg-[#ff9770] hover:bg-[#ff70a6] text-[#242424]"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const name = prompt("Profile name:")
                    if (name?.trim()) createProfile(name)
                  }}
                  className="bg-[#e9ff70] hover:bg-[#70d6ff] text-[#242424] font-bold px-3 py-1 border-2 border-[#242424] rounded text-sm"
                >
                  ➕ New Profile
                </button>
                <button
                  onClick={showGenerateDialog}
                  className="bg-[#ff70a6] hover:bg-[#ff9770] text-[#242424] font-bold px-3 py-1 border-2 border-[#242424] rounded text-sm"
                >
                  🪄 Generate with AI
                </button>
                <button
                  onClick={clearAllProfiles}
                  className="bg-[#ff9770] hover:bg-[#ff70a6] text-[#242424] font-bold px-3 py-1 border-2 border-[#242424] rounded text-sm"
                  disabled={cropProfiles.length === 0}
                >
                  🗑️ Clear All
                </button>
              </div>

              {/* Profile List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cropProfiles.map((profile) => (
                  <div key={profile._id} className="flex items-center justify-between p-3 bg-[#e9ff70] border-2 border-[#242424] rounded">
                    <div className="flex-1">
                      {editingProfile === profile._id ? (
                        <input
                          type="text"
                          value={editingProfileName}
                          onChange={(e) => setEditingProfileName(e.target.value)}
                          onBlur={() => {
                            if (editingProfileName.trim()) {
                              renameProfile(profile._id, editingProfileName)
                            }
                            setEditingProfile(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingProfileName.trim()) {
                                renameProfile(profile._id, editingProfileName)
                              }
                              setEditingProfile(null)
                            }
                          }}
                          className="font-bold text-[#242424] bg-[#ffffff] border-2 border-[#242424] rounded px-2 py-1 w-full"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div 
                            className="font-bold text-[#242424] cursor-pointer hover:underline"
                            onClick={() => {
                              setEditingProfile(profile._id)
                              setEditingProfileName(profile.name)
                            }}
                          >
                            {profile.name}
                          </div>
                          {profile.description && (
                            <div className="text-sm text-[#242424] opacity-75">{profile.description}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          applyProfile(profile)
                          setSelectedProfile(profile._id)
                        }}
                        className="px-2 py-1 border-2 border-[#242424] rounded text-sm font-bold bg-[#70d6ff] hover:bg-[#ff70a6] text-[#242424]"
                      >
                        📋 Apply
                      </button>
                      <button
                        onClick={() => deleteProfile(profile._id)}
                        className="px-2 py-1 border-2 border-[#242424] rounded text-sm font-bold bg-[#ff9770] hover:bg-[#ff70a6] text-[#242424]"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {cropProfiles.length === 0 && (
                  <div className="text-center py-8 text-[#242424] opacity-50">
                    No profiles yet. Create one or generate with AI.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Profiles Dialog */}
      {showPromptDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#ffffff] border-4 border-[#242424] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#242424] mb-4">🪄 Generate Profiles</h2>
            <p className="text-[#242424] mb-4">Customize the prompt to generate the types of profiles you need:</p>
            <textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-32 p-3 border-2 border-[#242424] rounded mb-4 text-[#242424]"
              placeholder="Describe what types of cropping profiles you want to generate..."
            />
            <div className="flex gap-3">
              <button
                onClick={generateProfiles}
                className="bg-[#70d6ff] hover:bg-[#ff70a6] text-[#242424] font-bold px-4 py-2 border-2 border-[#242424] rounded"
              >
                🪄 Generate Profiles
              </button>
              <button
                onClick={() => setShowPromptDialog(false)}
                className="bg-[#ff9770] hover:bg-[#ffd670] text-[#242424] font-bold px-4 py-2 border-2 border-[#242424] rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-[#ffffff] border-4 border-[#242424] rounded-lg p-6 mb-6 shadow-lg">
            <h1 className="text-4xl font-black text-[#242424] mb-2">🖼️ Image Cropper Pro</h1>
            <p className="text-[#242424] italic mb-4">
              *Professional batch image cropping with **custom profiles**, **high-fidelity output**, and **multi-file processing**. 
              Upload multiple images, create reusable cropping profiles, and batch process with **pixel-perfect quality**. 
              Perfect for creating **consistent image sets** for websites, social media, or print materials.*
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sticky Settings Panel */}
            <div className="md:col-span-1">
              <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                {/* Upload */}
                <div className="bg-[#ffffff] border-4 border-[#242424] rounded-lg p-4">
                  <h2 className="text-xl font-bold text-[#242424] mb-4">📤 Upload</h2>
                  <div>
                    <label className="block text-[#242424] font-bold mb-2">Select Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="w-full p-2 border-2 border-[#242424] rounded bg-[#e9ff70] text-sm"
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="bg-[#ffffff] border-4 border-[#242424] rounded-lg p-4">
                  <h2 className="text-xl font-bold text-[#242424] mb-4">⚙️ Settings</h2>
                  
                  <div className="space-y-3">
                    {/* Profile selector at top */}
                    <div className="flex gap-2">
                      <select
                        value={selectedProfile}
                        onChange={(e) => {
                          setSelectedProfile(e.target.value)
                          // Auto-apply when profile is selected
                          if (e.target.value) {
                            const profile = cropProfiles.find(p => p._id === e.target.value)
                            if (profile) applyProfile(profile)
                          }
                        }}
                        className="flex-1 p-2 border-2 border-[#242424] rounded text-sm"
                      >
                        <option value="">No Profile Selected</option>
                        {cropProfiles.map((profile) => (
                          <option key={profile._id} value={profile._id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowProfileDialog(true)}
                        className="px-3 py-2 border-2 border-[#242424] rounded text-sm font-bold bg-[#ff70a6] hover:bg-[#ff9770] text-[#242424]"
                        title="Manage profiles"
                      >
                        📋
                      </button>
                    </div>

                    <button
                      onClick={() => saveProfileFromCurrentSettings()}
                      className="w-full bg-[#e9ff70] hover:bg-[#70d6ff] text-[#242424] font-bold px-4 py-2 border-2 border-[#242424] rounded text-sm"
                      disabled={!selectedProfile}
                    >
                      💾 Save to Selected Profile
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[#242424] font-bold mb-1 text-xs">Min W</label>
                        <input
                          type="number"
                          value={minWidth}
                          onChange={(e) => setMinWidth(Number(e.target.value))}
                          className="w-full p-1 border-2 border-[#242424] rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[#242424] font-bold mb-1 text-xs">Max W</label>
                        <input
                          type="number"
                          value={maxWidth}
                          onChange={(e) => setMaxWidth(Number(e.target.value))}
                          className="w-full p-1 border-2 border-[#242424] rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[#242424] font-bold mb-1 text-xs">Min H</label>
                        <input
                          type="number"
                          value={minHeight}
                          onChange={(e) => setMinHeight(Number(e.target.value))}
                          className="w-full p-1 border-2 border-[#242424] rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[#242424] font-bold mb-1 text-xs">Max H</label>
                        <input
                          type="number"
                          value={maxHeight}
                          onChange={(e) => setMaxHeight(Number(e.target.value))}
                          className="w-full p-1 border-2 border-[#242424] rounded text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="aspectLock"
                        checked={aspectRatioLocked}
                        onChange={(e) => setAspectRatioLocked(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="aspectLock" className="text-[#242424] font-bold text-sm">Lock Aspect Ratio</label>
                    </div>

                    {aspectRatioLocked && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="useTarget"
                            checked={useTargetDimensions}
                            onChange={() => setUseTargetDimensions(true)}
                          />
                          <label htmlFor="useTarget" className="text-[#242424] font-bold text-sm">Target Dimensions</label>
                        </div>
                        
                        {useTargetDimensions && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Width"
                              value={targetWidth}
                              onChange={(e) => setTargetWidth(e.target.value)}
                              className="p-1 border-2 border-[#242424] rounded text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Height"
                              value={targetHeight}
                              onChange={(e) => setTargetHeight(e.target.value)}
                              className="p-1 border-2 border-[#242424] rounded text-sm"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="usePreset"
                            checked={!useTargetDimensions && !isCustomRatio}
                            onChange={() => {
                              setUseTargetDimensions(false)
                              setIsCustomRatio(false)
                            }}
                          />
                          <label htmlFor="usePreset" className="text-[#242424] font-bold text-sm">Preset Ratios</label>
                        </div>

                        {!useTargetDimensions && !isCustomRatio && (
                          <select
                            value={customAspectRatio}
                            onChange={(e) => setCustomAspectRatio(e.target.value)}
                            className="w-full p-1 border-2 border-[#242424] rounded text-sm"
                          >
                            <option value="1:1">Square (1:1)</option>
                            <option value="16:9">Widescreen (16:9)</option>
                            <option value="4:3">Standard (4:3)</option>
                            <option value="3:2">Photo (3:2)</option>
                            <option value="9:16">Portrait (9:16)</option>
                            <option value="2:3">Portrait Photo (2:3)</option>
                            <option value="21:9">Ultrawide (21:9)</option>
                          </select>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="useCustom"
                            checked={isCustomRatio && !useTargetDimensions}
                            onChange={() => {
                              setIsCustomRatio(true)
                              setUseTargetDimensions(false)
                            }}
                          />
                          <label htmlFor="useCustom" className="text-[#242424] font-bold text-sm">Custom Ratio</label>
                        </div>

                        {isCustomRatio && !useTargetDimensions && (
                          <div className="grid grid-cols-3 gap-1 items-center">
                            <input
                              type="number"
                              value={customNumerator}
                              onChange={(e) => setCustomNumerator(Number(e.target.value))}
                              className="p-1 border-2 border-[#242424] rounded text-sm"
                            />
                            <span className="text-center text-[#242424] font-bold">:</span>
                            <input
                              type="number"
                              value={customDenominator}
                              onChange={(e) => setCustomDenominator(Number(e.target.value))}
                              className="p-1 border-2 border-[#242424] rounded text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={cropAllImages}
                      className="w-full bg-[#70d6ff] hover:bg-[#ff70a6] text-[#242424] font-bold py-2 px-4 border-2 border-[#242424] rounded text-sm"
                      disabled={uploadedFiles.length === 0}
                    >
                      ✂️ Crop All Images
                    </button>

                    <button
                      onClick={downloadAllCroppedImages}
                      className="w-full bg-[#e9ff70] hover:bg-[#70d6ff] text-[#242424] font-bold py-2 px-4 border-2 border-[#242424] rounded text-sm"
                      disabled={uploadedFiles.length === 0}
                    >
                      💾 Download All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Images Area */}
            <div className="md:col-span-3">
              {uploadedFiles.length === 0 ? (
                <div className="bg-[#ffffff] border-4 border-[#242424] rounded-lg p-12">
                  <div className="text-center text-[#242424]">
                    <div className="text-6xl mb-4">📸</div>
                    <h2 className="text-2xl font-bold mb-2">No Images Uploaded</h2>
                    <p className="text-lg">Upload multiple images to start batch cropping</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {uploadedFiles.map((fileData, index) => (
                    <div key={fileData.id} className="bg-[#ffffff] border-4 border-[#242424] rounded-lg overflow-hidden">
                      {/* Image Header - Two rows */}
                      <div className="p-4 bg-[#e9ff70] border-b-4 border-[#242424] space-y-2">
                        {/* First row: Title, spacer, dropdown, trash */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4 flex-wrap">
                            {editingName === index ? (
                              <input
                                type="text"
                                value={imageNames[index] || fileData.name}
                                onChange={(e) => handleNameEdit(index, e.target.value)}
                                onBlur={() => setEditingName(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
                                className="text-lg font-bold text-[#242424] bg-[#ffffff] border-2 border-[#242424] rounded px-2 py-1"
                                autoFocus
                              />
                            ) : (
                              <h3 
                                className="text-lg font-bold text-[#242424] cursor-pointer hover:underline"
                                onClick={() => setEditingName(index)}
                              >
                                {imageNames[index] || fileData.name}
                              </h3>
                            )}
                            {processingQueue.has(index) && (
                              <span className="text-sm text-[#242424] bg-[#ff9770] px-2 py-1 rounded border-2 border-[#242424] animate-pulse">
                                Processing...
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap ml-auto">
                            {/* Profile Override */}
                            <select
                              value={imageProfiles[index] || 'default'}
                              onChange={(e) => handleProfileChange(index, e.target.value)}
                              className="p-1 border-2 border-[#242424] rounded text-sm bg-[#ffffff]"
                            >
                              <option value="default">Use Settings</option>
                              {cropProfiles.map((profile) => (
                                <option key={profile._id} value={profile._id}>
                                  {profile.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeImage(index)}
                              className="px-2 py-1 border-2 border-[#242424] rounded text-sm font-bold bg-[#ff9770] hover:bg-[#ff70a6] text-[#242424]"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Second row: Resolution info */}
                        <div className="flex items-center gap-4 flex-wrap text-sm text-[#242424]">
                          {originalDimensions[index] && (
                            <span className="bg-[#ffffff] px-2 py-1 rounded border-2 border-[#242424]">
                              Original: {originalDimensions[index].width}×{originalDimensions[index].height}
                            </span>
                          )}
                          {croppedImages[index] && (
                            <span className="bg-[#70d6ff] px-2 py-1 rounded border-2 border-[#242424]">
                              Cropped: {croppedImages[index].dimensions.width}×{croppedImages[index].dimensions.height}
                            </span>
                          )}
                          {getAspectRatioString(index) && (
                            <span className="bg-[#ffd670] px-2 py-1 rounded border-2 border-[#242424]">
                              Ratio: {getAspectRatioString(index)}
                            </span>
                          )}
                          {getSizeDelta(index) && (
                            <span className="bg-[#ff70a6] px-2 py-1 rounded border-2 border-[#242424]">
                              {getSizeDelta(index)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="flex border-b-4 border-[#242424]">
                        <button
                          onClick={() => handleTabChange(index, 'crop')}
                          className={`flex-1 py-3 px-4 font-bold border-r-2 border-[#242424] transition-colors ${
                            activeTab[index] === 'crop' 
                              ? 'bg-[#70d6ff] text-[#242424]' 
                              : 'bg-[#ffffff] text-[#242424] hover:bg-[#ffd670]'
                          }`}
                        >
                          ✂️ Crop View
                        </button>
                        <button
                          onClick={() => handleTabChange(index, 'result')}
                          className={`flex-1 py-3 px-4 font-bold transition-colors ${
                            activeTab[index] === 'result' 
                              ? 'bg-[#70d6ff] text-[#242424]' 
                              : 'bg-[#ffffff] text-[#242424] hover:bg-[#ffd670]'
                          }`}
                        >
                          🎯 Result View
                        </button>
                      </div>

                      {/* Image Content - Only show active tab */}
                      <div className="p-4 relative">
                        {activeTab[index] === 'crop' && (
                          <div className="w-full">
                            <div className="max-h-[600px] overflow-hidden">
                              <img
                                ref={el => {
                                  if (el) imageRefs.current[index] = el
                                }}
                                src={fileData.url}
                                alt={fileData.name}
                                className="max-w-full h-auto block"
                                style={{ maxHeight: '600px' }}
                              />
                            </div>
                          </div>
                        )}

                        {activeTab[index] === 'result' && (
                          <div className="relative">
                            {croppedImages[index] ? (
                              <div className="text-center">
                                <img
                                  src={croppedImages[index].url}
                                  alt={`${fileData.name} cropped`}
                                  className="max-w-full h-auto border-2 border-[#242424] rounded mx-auto"
                                  style={{ maxHeight: '500px' }}
                                />
                                {/* Floating Download Button */}
                                <button
                                  onClick={() => downloadImage(index)}
                                  className="absolute top-4 right-4 bg-[#e9ff70] hover:bg-[#70d6ff] text-[#242424] font-bold p-3 border-2 border-[#242424] rounded-full shadow-lg"
                                  title="Download cropped image"
                                >
                                  💾
                                </button>
                              </div>
                            ) : processingQueue.has(index) ? (
                              <div className="text-center py-12 text-[#242424]">
                                <div className="text-4xl mb-2 animate-spin">⚙️</div>
                                <p className="font-bold">Processing image...</p>
                              </div>
                            ) : (
                              <div className="text-center py-12 text-[#242424]">
                                <div className="text-4xl mb-2">🎯</div>
                                <p className="font-bold">No cropped image yet - switch to crop view to create one</p>
                                <button
                                  onClick={() => downloadImage(index)}
                                  className="mt-4 bg-[#e9ff70] hover:bg-[#70d6ff] text-[#242424] font-bold py-2 px-4 border-2 border-[#242424] rounded"
                                >
                                  💾 Create & Download
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}