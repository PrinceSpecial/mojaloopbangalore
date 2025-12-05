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
import { useUploadStore } from '~/stores/useUploadStore'

const model = defineModel({ type: Boolean })

const emit = defineEmits<{
  uploadSuccess: [data: { filename: string; timestamp: string; rowCount: number }]
}>()

const uploading = ref(false)
const progress = ref(0)
const currentFile = ref<File | null>(null)
const detectedRowCount = ref(0)
let xhr: XMLHttpRequest | null = null

// v-model target from UFileUpload — can be File, FileList, array or null
const fileModel = ref<any>(null)
const toast = useToast()
const uploadStore = useUploadStore()

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

// Whenever a file is selected, read and count CSV rows client-side (fast for <=10MB)
watch(currentFile, async (f) => {
  detectedRowCount.value = 0
  if (!f) return
  try {
    // use File.text() (modern browsers) to get content
    const text = await f.text()
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '')
    let count = lines.length
    if (count > 0) {
      const first = lines[0] || ''
      // heuristics: if first row looks like a header (contains letters and commas), subtract it
      if (first.includes(',') && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(first)) {
        count = Math.max(0, count - 1)
      }
    }
    detectedRowCount.value = count
  } catch (e) {
    // fallback to 0 on any error
    detectedRowCount.value = 0
  }
})

function uploadFile(fileArg?: File | null) {
  const file = fileArg || currentFile.value
  if (!file) return

  // send directly to the server CSV processing endpoint
  // const url = '/api/csvCheck'
  const url = '/api/payments/initiate'
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
    
    try {
      const status = xhr?.status || 0
      const text = xhr?.responseText || ''
      const data = text ? JSON.parse(text) : null

      if (status >= 200 && status < 300) {
        progress.value = 100
        // show success toast with server message
      

        // Persist to store and attach jobId returned by backend
        const jobId = data?.jobId as string | undefined
        // prefer detectedRowCount (client-side) if available, otherwise fallback to server-provided rows
        const rowCount = detectedRowCount.value || (data?.rows?.length || 0)
        const added = uploadStore.addFile({
          filename: currentFile.value?.name || 'Unknown',
          timestamp: Date.now(),
          rowCount,
          status: 'in_progress',
          jobId
        })

        // emit success event to parent for compatibility
        emit('uploadSuccess', {
          filename: currentFile.value?.name || 'Unknown',
          timestamp: new Date().toISOString(),
          rowCount
        })

        // small delay to show 100%, then close modal and navigate to transaction page for this file
        setTimeout(() => {
          progress.value = 0
          currentFile.value = null
          fileModel.value = null
          model.value = false
         
        }, 800)
      } else {
        // non-2xx
        toast.add({
          title: 'Erreur upload',
          description: data?.message || `Serveur renvoyé ${status}`,
          color: 'error'
        })
      }
    } catch (err: any) {
      toast.add({ title: 'Erreur', description: err.message || 'Erreur lors du traitement', color: 'error' })
    }
  }

  xhr.onerror = () => {
    uploading.value = false
    toast.add({ title: 'Erreur réseau', description: 'Impossible de contacter le serveur', color: 'error' })
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