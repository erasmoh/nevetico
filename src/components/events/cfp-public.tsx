"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { submitCfpProposal, voteProposal, type CfpFormState } from "@/app/actions/cfp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp } from "lucide-react";

type Proposal = {
  id: string;
  title: string;
  abstract: string;
  format: string;
  duration_minutes: number | null;
  speaker_name: string;
  speaker_bio: string | null;
  votes: number;
  voted: boolean;
};

export function CfpPublic({
  eventId,
  proposals,
}: {
  eventId: string;
  proposals: Proposal[];
}) {
  const [action, formAction] = useActionState<CfpFormState, FormData>(
    submitCfpProposal,
    undefined,
  );
  const [votingFor, setVotingFor] = useState<string | null>(null);

  useEffect(() => {
    if (action?.ok) toast.success("¡Propuesta enviada! El organizador la revisará.");
    if (action?.error) toast.error(action.error);
  }, [action]);

  const vote = (proposalId: string, email: string) => {
    if (!email) {
      toast.error("Necesitas un correo para votar.");
      return;
    }
    setVotingFor(proposalId);
    voteProposal(proposalId, email).then((r) => {
      setVotingFor(null);
      if (r?.error) toast.error(r.error);
      else toast.success("¡Voto registrado!");
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Envía tu propuesta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="event_id" value={eventId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título" name="title" required />
              <Field label="Formato" name="format" as="select" options={[
                { value: "talk", label: "Charla" },
                { value: "workshop", label: "Workshop" },
                { value: "lightning", label: "Lightning talk" },
                { value: "panel", label: "Panel" },
              ]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="abstract">Resumen</Label>
              <Textarea id="abstract" name="abstract" rows={4} required placeholder="De qué trata tu propuesta..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Duración (min)" name="duration_minutes" type="number" />
              <Field label="Tu nombre" name="speaker_name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tu correo" name="speaker_email" type="email" required />
              <Field label="Link (web, LinkedIn)" name="speaker_link" type="url" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="speaker_bio">Bio corta</Label>
              <Textarea id="speaker_bio" name="speaker_bio" rows={2} placeholder="Cuéntanos sobre ti..." />
            </div>
            {action?.errors ? (
              <p className="text-sm text-destructive">
                {Object.values(action.errors)[0]}
              </p>
            ) : null}
            <Button type="submit">Enviar propuesta</Button>
          </form>
        </CardContent>
      </Card>

      {proposals.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Propuestas aprobadas</h2>
          {proposals.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {p.speaker_name} · {p.format}
                      {p.duration_minutes ? ` · ${p.duration_minutes}min` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <ThumbsUp className="mr-1 size-3" /> {p.votes}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">{p.abstract}</p>
                {p.speaker_bio ? (
                  <p className="text-xs text-muted-foreground">{p.speaker_bio}</p>
                ) : null}
                <VoteForm proposalId={p.id} voted={p.voted} voting={votingFor === p.id} onVote={vote} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  as,
  options,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  as?: "select";
  options?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      {as === "select" ? (
        <select
          id={name}
          name={name}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <Input id={name} name={name} type={type} required={required} />
      )}
    </div>
  );
}

function VoteForm({
  proposalId,
  voted,
  voting,
  onVote,
}: {
  proposalId: string;
  voted: boolean;
  voting: boolean;
  onVote: (id: string, email: string) => void;
}) {
  const [email, setEmail] = useState("");
  if (voted) {
    return <p className="text-xs text-muted-foreground">Ya votaste por esta propuesta.</p>;
  }
  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 max-w-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={voting || !email}
        onClick={() => onVote(proposalId, email)}
      >
        <ThumbsUp className="size-4" /> Votar
      </Button>
    </div>
  );
}
