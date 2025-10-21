---
timestamp: 'Tue Oct 21 2025 12:15:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_121555.9b2a06ac.md]]'
content_id: 6fed3cbbe3c781d20bff6af1ae566c8ef25bbb33417ca61e53c2395aff3318f3
---

# response:

Okay, let's create an SVG that looks like a group icon with three people within a `.vue` file.

Here's the `.vue` component code:

```vue
<template>
  <svg
    width="100"
    height="100"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby="groupIconTitle"
    role="img"
  >
    <title id="groupIconTitle">Group Icon with Three People</title>

    <!-- Background Circle (optional, but common for icons) -->
    <circle cx="50" cy="50" r="45" fill="#f0f0f0" stroke="#ccc" stroke-width="2" />

    <!-- Person 1 (Left) -->
    <g transform="translate(25, 55)">
      <circle cx="0" cy="0" r="15" fill="#6c757d" /> <!-- Head -->
      <path d="M0 -15 L0 -40 L-10 -40 L-10 -60 L10 -60 L10 -40 L0 -40 Z" fill="#6c757d" /> <!-- Body -->
    </g>

    <!-- Person 2 (Center) -->
    <g transform="translate(50, 55)">
      <circle cx="0" cy="0" r="15" fill="#007bff" /> <!-- Head -->
      <path d="M0 -15 L0 -40 L-10 -40 L-10 -60 L10 -60 L10 -40 L0 -40 Z" fill="#007bff" /> <!-- Body -->
    </g>

    <!-- Person 3 (Right) -->
    <g transform="translate(75, 55)">
      <circle cx="0" cy="0" r="15" fill="#28a745" /> <!-- Head -->
      <path d="M0 -15 L0 -40 L-10 -40 L-10 -60 L10 -60 L10 -40 L0 -40 Z" fill="#28a745" /> <!-- Body -->
    </g>
  </svg>
</template>

<script>
export default {
  name: 'GroupIcon'
  // You can add props here if you want to customize colors, sizes, etc.
  // props: {
  //   backgroundColor: {
  //     type: String,
  //     default: '#f0f0f0'
  //   },
  //   personColor1: {
  //     type: String,
  //     default: '#6c757d'
  //   },
  //   personColor2: {
  //     type: String,
  //     default: '#007bff'
  //   },
  //   personColor3: {
  //     type: String,
  //     default: '#28a745'
  //   }
  // }
};
</script>

<style scoped>
/* Add any specific styling for the SVG container or elements here if needed */
</style>
```

**Explanation:**

1. **`<template>`:** This is where the SVG markup resides.
   * **`<svg>` element:**
     * `width="100"` and `height="100"`: Sets the dimensions of the SVG to be 100x100 pixels.
     * `viewBox="0 0 100 100"`: Defines the coordinate system within the SVG. This makes it easier to scale the SVG without distorting its contents.
     * `fill="none"`: By default, SVG elements have a fill. Setting it to `none` here means the shapes themselves don't have a default fill color, and we'll apply fills explicitly.
     * `xmlns="http://www.w3.org/2000/svg"`: The XML namespace for SVG.
     * `aria-labelledby="groupIconTitle"` and `role="img"`: Accessibility attributes to describe the SVG's purpose.
   * **`<title>`:** Provides an accessible title for the SVG.
   * **`<!-- Background Circle -->`:** An optional circle to act as a background for the group. I've given it a light gray fill and a darker gray stroke. You can remove this if you prefer just the people.
   * **`<!-- Person 1 (Left) -->` to `<!-- Person 3 (Right) -->`:** Each person is represented by a `<g>` (group) element. This allows us to apply transformations (like `translate`) to the entire group of elements that make up a person.
     * **`transform="translate(x, y)"`:** This moves the origin of the coordinate system for the group. We're using this to position each person.
     * **`<circle>`:** Represents the head of the person.
       * `cx` and `cy`: The center coordinates of the circle.
       * `r`: The radius of the circle.
       * `fill`: The color of the head. I've used different colors for each person for visual distinction.
     * **`<path>`:** Represents the body of the person.
       * `d` attribute: This is the path data. The commands used here create a simple rectangular body with slightly rounded shoulders.
         * `M0 -15`: Move to the starting point (top-center of the body, directly below the head).
         * `L0 -40`: Draw a line down.
         * `L-10 -40`: Draw a line to the left (forming a shoulder).
         * `L-10 -60`: Draw a line down (forming the side of the body).
         * `L10 -60`: Draw a line to the right (forming the bottom of the body).
         * `L10 -40`: Draw a line up (forming the other side of the body).
         * `L0 -40`: Draw a line back to the left shoulder line.
         * `Z`: Close the path.
       * `fill`: The color of the body.

2. **`<script>`:**
   * `export default { name: 'GroupIcon' };`: This is standard Vue component export.
   * **`props` (commented out):** I've included commented-out `props` as an example. If you want to make the icon customizable (e.g., change the colors, size, or background), you would uncomment these and pass values to the component when you use it.

3. **`<style scoped>`:** You can add CSS here for any specific styling needs for this component. `scoped` ensures the styles only apply to this component.

**How to Use in a Vue Project:**

1. Save this code as a `.vue` file (e.g., `GroupIcon.vue`) in your `src/components` folder.
2. Import and use it in another component:

   ```vue
   <template>
     <div>
       <h1>My App</h1>
       <GroupIcon />
       <!-- Or with custom colors if you uncomment props -->
       <!-- <GroupIcon
         :personColor1="'red'"
         :personColor2="'blue'"
         :personColor3="'green'"
       /> -->
     </div>
   </template>

   <script>
   import GroupIcon from './components/GroupIcon.vue'; // Adjust the path if needed

   export default {
     name: 'App',
     components: {
       GroupIcon
     }
   };
   </script>
   ```

This will render an SVG icon of three people, centered within a background circle. You can easily adjust the `viewBox`, `width`, `height`, and colors to fit your specific design needs.
