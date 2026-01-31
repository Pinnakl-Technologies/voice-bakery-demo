import { useEffect, useState } from "react";


function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Theme: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [processedCallIds] = useState(new Set());

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      setFunctionAdded(true);
    }

    // Check recent events for tool calls (scanning last 5 to be safe against interleaved events)
    const recentEvents = events.slice(0, 5);

    recentEvents.forEach(mostRecentEvent => {
      if (
        mostRecentEvent.type === "response.done" &&
        mostRecentEvent.response.output
      ) {
        mostRecentEvent.response.output.forEach(async (output) => {
          if (output.type === "function_call") {
            // Prevent duplicate processing
            if (processedCallIds.has(output.call_id)) {
              return;
            }

            // Mark as processed immediately
            processedCallIds.add(output.call_id);
            console.log("Processing function call:", output.call_id, output.name);

            if (output.name === "display_color_palette") {
              console.log("Display color palette function call detected:", output);
              setFunctionCallOutput(output);

              // Send the execution result back to OpenAI so it knows the tool finished
              sendClientEvent({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: output.call_id,
                  output: JSON.stringify({ success: true }), // Simple acknowledgement
                },
              });

              // Request a new response immediately
              sendClientEvent({
                type: "response.create",
                response: {
                  instructions: `
                  ask for feedback about the color palette - don't repeat 
                  the colors, just ask if they like the colors.
                `,
                },
              });

            } else {

              try {
                // Call our backend to execute the tool
                const response = await fetch("/execute-tool", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: output.id,
                    name: output.name,
                    call_id: output.call_id,
                    arguments: JSON.parse(output.arguments), // Passing as object to backend
                  }),
                });

                const data = await response.json();
                console.log("Backend response:", data);

                // Send the function output back to the model
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: output.call_id,
                    output: JSON.stringify(data),
                  },
                });

                // Trigger a response from the model
                sendClientEvent({ type: "response.create" });
              } catch (error) {
                console.error("Error executing tool:", error);
              }
            }

          }
        });
      }
    });

  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
      processedCallIds.clear(); // Reset processed IDs on new session
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Color Palette Tool</h2>
        {isSessionActive
          ? (
            functionCallOutput
              ? <FunctionCallOutput functionCallOutput={functionCallOutput} />
              : <p>Ask for advice on a color palette...</p>
          )
          : <p>Start the session to use this tool...</p>}
      </div>
    </section>
  );
}
