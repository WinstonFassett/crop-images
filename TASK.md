# The Rules:
- Copilot never runs the dev server. The user is always running it

# The Task: UX Improvements

This vibe-coded bulk image cropper works well, but needs some tweaks to tighten it up. Should not require functional changes mostly.

Header looks dumb. Just call it bulk image cropper and a brief description.

Image profile mgt is confusing. 

Layout jumps when changing tabs.
Should be able to use known style to not lose the space, and image dims if really necessary to hold the space.

Circle buttons to save files are not circular.

Rename
Crop View -> Full Image
Result View -> Cropped Image

If possible, configure to require cmd key for cropper zooming in order to not mess with scrolling. Not sure what is possible. Use tavily and context7 to find out.

Love the colors but prefer dark theme. 

On narrow screens, settings row elements are getting pushed out of view. select is too wide and pushes manage profiles button out of view.

Manage profiles is almost a primary action. Main things are: Manage profiles, Upload Images, Crop All Images, Download Images. 

This makes no sense to me:

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

  Once images are uploaded and showing I think we can clear the upload control?

  "Save to" UX needs help, is confusing. I think it should just have these rows:

  Selector
  Manage Image Profiles Gear
  Save Changes (to whatever profile is selected -- if a profile is selected AND "dirty")
