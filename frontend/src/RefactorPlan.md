```text
frontend/src/
├── App.tsx
├── App.css
├── main.tsx
│
├── pages/                              # unchanged — good
│   ├── EntryPage.tsx
│   ├── EntryPage.module.css
│   ├── ProjectCreationPage.tsx
│   ├── ProjectAnnotationPage.tsx
│   └── ProjectQuickStartPage.tsx
│
├── store/                              # renamed from features/ — clearer intent
│   ├── index.tsx
│   ├── annotationSession/
│   │   ├── context.ts
│   │   └── reducer.ts
│   ├── projectAnnotation/
│   │   ├── context.ts
│   │   └── reducer.ts
│   ├── projectCreation/
│   │   ├── context.tsx
│   │   └── reducer.tsx
│   └── visualizationSetting/
│       └── context.ts
│
├── components/
│   │
│   ├── ui/                             # renamed from common/ — only generic, reusable UI
│   │   ├── Button.tsx
│   │   ├── LogoBlock.tsx
│   │   ├── ImageUploader/
│   │   │   ├── ImageUploader.tsx
│   │   │   └── ImageUploader.module.css
│   │   ├── ImageGallery/
│   │   │   ├── ImageGallery.tsx
│   │   │   ├── ImageBlock.tsx
│   │   │   └── ImageBlockWithSelection.tsx
│   │   ├── Labels/
│   │   │   ├── LabelBar.tsx
│   │   │   ├── LabelBlock.tsx
│   │   │   ├── AddLabelBlock.tsx
│   │   │   ├── LabelSearcher.tsx
│   │   │   └── Labels.module.css
│   │   ├── Statistic/
│   │   │   ├── StatisticTable.tsx
│   │   │   ├── StatisticTableRow.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── CroppedCanvas.tsx
│   │   │   └── Statistic.module.css
│   │   ├── Modal/                      # renamed from PopUpMessages/ — standard UI term
│   │   │   ├── ModalContext.tsx        # was PopMessageContext.tsx
│   │   │   ├── Modal.tsx               # was PopMessager.tsx
│   │   │   ├── Modal.module.css
│   │   │   ├── ErrorModal.tsx          # was ErrorMessager.tsx
│   │   │   ├── LoadingModal.tsx        # was LoadingMessager.tsx
│   │   │   ├── ProjectNameModal.tsx    # was ProjectNameMessager.tsx
│   │   │   └── TextInputModal.tsx      # was TextInputMessager.tsx
│   │   └── Settings/                   # generic settings controls, keep here
│   │       ├── index.ts
│   │       ├── SettingGroups.tsx
│   │       ├── SettingSelectBlock.tsx
│   │       ├── SettingSliderBlock.tsx
│   │       └── Settings.module.css
│   │
│   ├── annotation/                     # new folder — domain-specific annotation components
│   │   ├── ActionButtons/              # moved from common/
│   │   │   ├── ActionButton.tsx
│   │   │   ├── ActivateLabelButton.tsx
│   │   │   ├── AssignLabelButton.tsx
│   │   │   ├── LabelPickerButton.tsx
│   │   │   └── SmallLabelButton.tsx
│   │   ├── AnnotationSettings/         # moved from common/
│   │   │   ├── AnnotationSiderBlock.tsx
│   │   │   ├── AnnotationToggleBlock.tsx
│   │   │   └── AnnotationSettings.module.css
│   │   └── ScaleDefinition/            # fixed typo from ScaleDefintion/
│   │       ├── LineBlock.tsx
│   │       ├── ScaledLineCanvas.tsx
│   │       └── ScaleDefinition.module.css
│   │
│   ├── layout/                         # structural shell — header, sidebar, bars, canvas
│   │   ├── Header.tsx
│   │   ├── HeaderWithNavigation.tsx    # fixed typo from HeaderWIthNavigation.tsx
│   │   ├── SideBar.tsx
│   │   ├── ScaledLineSideBar.tsx       # fixed typo + moved from layout/ root
│   │   ├── AnnotationSideBar.tsx
│   │   ├── ActionBar.tsx
│   │   ├── AnnotationToolBar.tsx
│   │   ├── BottomBar.tsx
│   │   ├── AnnotationCanvas.tsx
│   │   ├── StatisticCanvas.tsx
│   │   ├── ImageLevelStatisticView.tsx
│   │   ├── InstanceLevelStatisticView.tsx
│   │   └── SideBarButtons/             # moved from common/ — navigation is layout
│   │       ├── index.ts
│   │       ├── SideBarButton.tsx
│   │       ├── SideBarDropDownButton.tsx
│   │       └── SideBarDropDownList.tsx
│   │
│   └── panels/                         # unchanged — page-specific feature panels
│       ├── ProjectAnnotation/
│       │   ├── index.ts
│       │   ├── AnnotationBars.tsx
│       │   ├── AnnotationPanel.tsx
│       │   ├── ImageGalleryPanel.tsx
│       │   ├── ScaleDefinePanel.tsx
│       │   ├── StatisticPanel.tsx
│       │   └── UploadProjectPanel.tsx
│       ├── ProjectCreation/
│       │   ├── index.ts
│       │   ├── ProjectSettingPanel.tsx
│       │   └── UploadImagePanel.tsx
│       └── ProjectQuickStart/
│           ├── index.ts
│           ├── ImageDisplayBlock.tsx
│           ├── QuickStartUploadImagePanel.tsx
│           └── QuickStart.module.css
│
├── types/
│   ├── api.ts
│   ├── Point.ts
│   ├── RLE.ts
│   ├── CompressedRLE.ts
│   ├── ImageData.ts                    # fixed .tsx → .ts (no JSX)
│   ├── annotation/                     # lowercase — type folders, not component folders
│   │   ├── index.ts
│   │   ├── Annotation.ts
│   │   ├── AnnotationCommand.ts
│   │   ├── AnnotationSession.ts
│   │   ├── Data.ts
│   │   ├── Label.ts
│   │   ├── PendingAnnotation.ts
│   │   ├── PointPrompt.ts
│   │   ├── Project.ts
│   │   ├── ScaledLine.ts
│   │   └── VisualizationSetting.ts
│   ├── projectCreation/                # lowercase
│   │   ├── index.ts                    # fixed .tsx → .ts
│   │   ├── AnnotationFile.ts
│   │   ├── CocoAnnotation.ts
│   │   ├── CocoCategory.ts
│   │   ├── ImageSelectionData.ts       # fixed .tsx → .ts
│   │   ├── ProjectConfig.ts            # fixed .tsx → .ts
│   │   └── projectCreationState.ts     # fixed .tsx → .ts
│   └── coralWatch/                     # lowercase
│       ├── Color.ts
│       ├── CoralWatch.ts
│       └── CoralWatchCategory.ts
│
├── services/                           # unchanged
├── hooks/                              # unchanged
│
├── utils/
│   ├── canvasLayers.ts
│   ├── cocoRle.ts
│   ├── color.ts
│   ├── download.ts
│   ├── labelColorMap.ts                # moved from components/common/ — it's a constant, not a component
│   └── saveBlobWithPicker.ts
│
└── assets/                             # unchanged

```

