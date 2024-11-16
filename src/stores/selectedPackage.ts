import { ref } from "vue";

// Create a singleton store
const packageName = ref('');
const packageVersion = ref('');

function updatePackage(newName: string, newVersion: string) {
  packageName.value = newName;
  packageVersion.value = newVersion;
  console.log('updated!');
}

export function usePackage() {
  return {
    packageName,
    packageVersion,
    updatePackage,
  };
}
