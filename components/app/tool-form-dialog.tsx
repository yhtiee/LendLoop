"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CONDITIONS, type Category, type Condition } from "@/lib/domain";
import { errorMessage } from "@/lib/errors";

export type EditableTool = {
  _id: Id<"tools">;
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};

export function ToolFormDialog({
  tool,
  open,
  onOpenChange,
}: {
  /** Pass a tool to edit it; omit to create. */
  tool?: EditableTool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* key resets the form whenever the dialog switches tool */}
        <ToolForm key={tool?._id ?? "new"} tool={tool} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ToolForm({ tool, onDone }: { tool?: EditableTool | null; onDone: () => void }) {
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const editing = !!tool;
  const [category, setCategory] = useState<Category | "">(tool?.category ?? "");
  const [condition, setCondition] = useState<Condition | "">(tool?.condition ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "");
    if (!name || !category || !condition) return;
    setSubmitting(true);
    try {
      const fields = { name, category, condition, description };
      if (tool) await update({ toolId: tool._id, ...fields });
      else await create(fields);
      toast.success(editing ? "Listing updated" : "Tool listed", { description: name });
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit listing" : "List a tool"}</DialogTitle>
        <DialogDescription>
          Visitors see the name and category. Signed-in neighbours see the rest.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={60}
            defaultValue={tool?.name}
            placeholder="e.g. Cordless drill"
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)} required>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="condition">Condition</FieldLabel>
            <Select value={condition} onValueChange={(v) => setCondition(v as Condition)} required>
              <SelectTrigger id="condition" className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            maxLength={500}
            defaultValue={tool?.description}
            placeholder="What's included, anything borrowers should know"
            className="min-h-20"
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={!category || !condition || submitting}>
          {submitting ? "Saving…" : editing ? "Save changes" : "List tool"}
        </Button>
      </DialogFooter>
    </form>
  );
}
