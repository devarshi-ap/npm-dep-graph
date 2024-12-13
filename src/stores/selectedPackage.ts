import { ref } from "vue";

// Create a singleton store
const packageName = ref('');
const packageVersion = ref('');

function updateName(newName: string) {
    packageName.value = newName;
    console.log('updated name!')
}

function updateVersion(newVersion: string) {
  packageVersion.value = newVersion;
  console.log('updated version!');
}

export function usePackage() {
  return {
    packageName,
    packageVersion,
    updateName,
    updateVersion
  };
}
