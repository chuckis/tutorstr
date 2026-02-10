type IdentityCardProps = {
  npub: string;
};

export function IdentityCard({ npub }: IdentityCardProps) {
  return (
    <div className="identity">
      <span>npub</span>
      <strong>{npub}</strong>
    </div>
  );
}
