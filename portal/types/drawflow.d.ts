declare module "drawflow" {
  interface DrawflowNode {
    id: number;
    name: string;
    data: Record<string, unknown>;
    class: string;
    html: string;
    typenode: boolean;
    inputs: Record<string, { connections: Array<{ node: string; input: string }> }>;
    outputs: Record<string, { connections: Array<{ node: string; output: string }> }>;
    pos_x: number;
    pos_y: number;
  }

  interface DrawflowData {
    drawflow: {
      [module: string]: {
        data: Record<string, DrawflowNode>;
      };
    };
  }

  class Drawflow {
    constructor(container: HTMLElement, render?: unknown, parent?: unknown);

    drawflow: DrawflowData;
    reroute: boolean;
    reroute_fix_curvature: boolean;
    force_first_input: boolean;
    editor_mode: "edit" | "view" | "fixed";
    zoom: number;
    zoom_max: number;
    zoom_min: number;

    start(): void;
    clear(): void;

    addNode(
      name: string,
      inputs: number,
      outputs: number,
      posX: number,
      posY: number,
      className: string,
      data: Record<string, unknown>,
      html: string,
      typenode?: boolean
    ): number;

    removeNodeId(id: string): void;

    addConnection(
      nodeOutput: number,
      nodeInput: number,
      outputClass: string,
      inputClass: string
    ): void;

    removeSingleConnection(
      nodeOutput: number,
      nodeInput: number,
      outputClass: string,
      inputClass: string
    ): void;

    zoom_in(): void;
    zoom_out(): void;
    zoom_reset(): void;

    on(
      event: string,
      callback: (...args: unknown[]) => void
    ): void;

    import(data: DrawflowData): void;
    export(): DrawflowData;
  }

  export default Drawflow;
}
