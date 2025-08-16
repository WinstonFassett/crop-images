# TODO

## Bugs

- Download all fails with "No cropped images available to download"
  - works after crop all. but should not require that.
- Downloaded files have no extension!
- Quality seems stuck at 100%

## Problems

- Dupe code probably between save all and save single
- Using JS alerts/confirms/prompts instead of proper dialogs

## Refactoring

- Factor out use-fireproof. Use zustand persistence instead
  - create profiles store. oh we already have one. persist it.
- Factor out ImageCropperPrototype (easy, fast)
- make dialogs use ui/dialog


ImageList -> imageStore
ImageItem -> useCropItem, ImageCropperTab, ImageResultTab
ImageCropperTab -> useCropItem
ImageResultTab -> useCropItem
CropInfoDisplay -> useCropperStore, useImageStore
useCropItem -> useImageStore, useCropperStore
useCroppedImage -> useImageStore, useCropperStore

SettingsPanel -> useTaskStore
useCropperStore -> useTaskStore 