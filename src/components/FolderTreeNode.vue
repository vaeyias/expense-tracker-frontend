<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps<{
  node: any
  disabledSet: Set<string> | null
  selected: string | null
}>()

const emit = defineEmits<{
  'update:selected': [val: string | null]
  toggle: [node: any]
}>()

function toggleNode() {
  // ask parent to (lazy) load children first
  emit('toggle', props.node)
  // provide immediate visual feedback
  props.node.expanded = !props.node.expanded
}

function selectNode() {
  emit('update:selected', props.node._id)
}
</script>

<template>
  <div>
    <div class="folder-node" :class="{ disabled: disabledSet && disabledSet.has(node._id) }">
      <button class="node-expander" @click="toggleNode">
        {{ node.expanded ? '▾' : node.loaded ? '▸' : '▸' }}
      </button>

      <input
        type="radio"
        :value="node._id"
        :checked="selected === node._id"
        @change="selectNode"
        :disabled="disabledSet ? disabledSet.has(node._id) : false"
      />

      <span class="node-label" @click="selectNode">{{ node.name }}</span>
    </div>

    <ul
      v-if="node.expanded && node.children && node.children.length"
      style="list-style: none; padding-left: 18px; margin: 6px 0 0 0"
    >
      <li v-for="child in node.children" :key="child._id">
        <!-- recurse into this same component -->
        <FolderTreeNode
          :node="child"
          :disabledSet="disabledSet"
          :selected="selected"
          @update:selected="(val: string | null) => emit('update:selected', val)"
          @toggle="(node: any) => emit('toggle', node)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.folder-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
}
.folder-node.disabled {
  opacity: 0.45;
  pointer-events: none;
}
.node-expander {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  width: 22px;
}
.node-label {
  cursor: pointer;
  user-select: none;
}
</style>
