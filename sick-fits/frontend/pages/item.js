import SingleItems from "../components/SingleItem";

const Item = props => (
  <div>
    <SingleItems id={props.query.id} />
  </div>
);

export default Item;
