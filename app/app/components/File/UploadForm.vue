<template>
  <UModal title="Téléverser le fichier" v-model:open="model" :close="{
    color: 'error',
    variant: 'outline',
    class: 'rounded-full'
  }" description="Veuillez importer un fichier CSV contenant la liste des transactions">
    <template #body>

      <div class="flex flex-col items-center gap-4">
        <UFileUpload v-model="fileModel" icon="i-lucide-file" label="Déposez votre fichier ici"
          description="CSV (max. 10MB)" class="w-96 m-auto min-h-48 cursor-pointer" highlight color="primary"
          accept=".csv,text/csv" />

        <div v-if="currentFile" class="w-96 flex items-center justify-between gap-3 text-sm">
          <div class="truncate">Fichier: <span class="font-medium">{{ currentFile.name }}</span></div>
          <div class="text-gray-500">{{ (progress > 0) ? progress + '%' : '' }}</div>
        </div>

        <div class="w-96 flex gap-2">
          <button v-if="!uploading && currentFile" @click="uploadFile(currentFile)"
            class="btn btn-primary w-full">Téléverser</button>
          <button v-if="!uploading && currentFile" @click="() => { fileModel = null; progress = 0 }"
            class="btn btn-ghost w-full">Annuler</button>
          <button v-if="uploading" @click="cancelUpload" class="btn btn-danger w-full">Annuler le chargement</button>
        </div>

      </div>

    </template>
  </UModal>

  <!-- Teleported progress bar (renders into <body> so it can float above modal/backdrop) -->
  <teleport to="body">
    <transition name="fade-up">
      <div v-if="uploading || progress > 0"
        class="fixed top-6 left-1/2 transform -translate-x-1/2 w-[92%] max-w-3xl pointer-events-none"
        style="z-index:99999">
        <div class="bg-white rounded-lg shadow-xl border border-primary-300 p-3 pointer-events-auto">
          <div class="flex items-center justify-between gap-4 relative">
            <div class="flex items-center gap-3">
              <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <div>
                <div class="text-sm font-medium">Téléversement en cours</div>
                <div class="text-xs text-gray-400">{{ currentFile ? currentFile.name : 'Préparation...' }}</div>
              </div>
            </div>

            <div class="w-48 text-right text-sm font-semibold">{{ progress }}%</div>

            <!-- Small cancel/close button in the progress bar -->
            <button @click="cancelUpload" type="button" aria-label="Annuler le téléversement"
              class="absolute -top-3 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"
                aria-hidden="true">
                <path fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <div class="mt-3">
            <div class="h-3 bg-gray-200 rounded overflow-hidden">
              <div class="h-full progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>


<script lang="ts" setup>
import { ref, watch } from 'vue'

const model = defineModel({ type: Boolean })

const uploading = ref(false)
const progress = ref(0)
const currentFile = ref<File | null>(null)
let xhr: XMLHttpRequest | null = null

// v-model target from UFileUpload — can be File, FileList, array or null
const fileModel = ref<any>(null)

watch(fileModel, (val) => {
  if (!val) {
    currentFile.value = null
    return
  }
  if (val instanceof File) {
    currentFile.value = val
    return
  }
  if (Array.isArray(val) && val.length > 0 && val[0] instanceof File) {
    currentFile.value = val[0]
    return
  }
  if (val && val.length !== undefined && val[0] instanceof File) {
    currentFile.value = val[0]
    return
  }
  currentFile.value = null
})

function uploadFile(fileArg?: File | null) {
  const file = fileArg || currentFile.value
  if (!file) return

  const url = '/api/upload'
  const fd = new FormData()
  fd.append('file', file)

  xhr = new XMLHttpRequest()
  xhr.open('POST', url)

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      progress.value = Math.round((event.loaded / event.total) * 100)
    }
  }

  xhr.onload = () => {
    uploading.value = false
    if (xhr && xhr.status === 200) {
      progress.value = 100
      // small delay to show 100%, then close modal
      setTimeout(() => {
        progress.value = 0
        currentFile.value = null
        fileModel.value = null
        model.value = false
      }, 800)
    }
  }

  xhr.onerror = () => {
    uploading.value = false
  }

  uploading.value = true
  progress.value = 0
  xhr.send(fd)
}

function cancelUpload() {
  if (xhr) xhr.abort()
  uploading.value = false
  progress.value = 0
  currentFile.value = null
  fileModel.value = null
}
</script>

<style scoped>
.progress-fill {
  background: linear-gradient(90deg, #06b6d4, #7c3aed);
  height: 100%;
  transition: width 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35) inset;
  background-size: 200% 100%;
  animation: shimmer 2.5s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all .25s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-up-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.fade-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>